use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use futures::future::join_all;
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::mpsc;
use tokio::time::{Instant, MissedTickBehavior};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use twitch_api::twitch_oauth2::UserToken;

use crate::error::Error;
use crate::ws::{ConnectionState, SubscriptionStore};

const TWITCH_PUBSUB_WS_URI: &str = "wss://pubsub-edge.twitch.tv";

/// Clients must PING at least once every 5 minutes. We ping comfortably under
/// that, plus a small per-connection jitter to avoid a thundering herd.
const PING_INTERVAL: Duration = Duration::from_secs(240);

/// If a PONG is not received within 10 seconds of a PING, the connection is
/// considered dead and we reconnect.
const PONG_TIMEOUT: Duration = Duration::from_secs(10);

/// Initial reconnect backoff, doubled on each consecutive failure.
const INITIAL_BACKOFF: Duration = Duration::from_secs(1);

/// Maximum reconnect backoff threshold.
const MAX_BACKOFF: Duration = Duration::from_secs(120);

/// Twitch allows up to 50 topics per LISTEN connection.
const MAX_TOPICS_PER_LISTEN: usize = 50;

/// A decoded PubSub `MESSAGE`, forwarded to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct PubSubMessage {
    pub topic: String,
    pub message: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct MessageData {
    topic: String,
    /// The inner message is an escaped JSON string.
    message: String,
}

#[derive(Debug, Deserialize)]
struct AuthRevokedData {
    topics: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum Incoming {
    #[serde(rename = "PONG")]
    Pong,
    #[serde(rename = "RECONNECT")]
    Reconnect,
    #[serde(rename = "RESPONSE")]
    Response {
        #[serde(default)]
        nonce: Option<String>,
        #[serde(default)]
        error: String,
    },
    #[serde(rename = "MESSAGE")]
    Message { data: MessageData },
    #[serde(rename = "AUTH_REVOKED")]
    AuthRevoked { data: AuthRevokedData },
}

/// Outcome of handling an incoming frame, signalled back to the connection loop.
enum Action {
    None,
    Pong,
    Reconnect,
}

pub struct PubSubClient {
    token: Arc<UserToken>,
    state: ConnectionState,
    /// Subscriptions keyed by `"channel:topic"`; the value is the full topic.
    subscriptions: SubscriptionStore<String>,
    sender: mpsc::UnboundedSender<PubSubMessage>,
    message_tx: mpsc::UnboundedSender<Message>,
    nonce: AtomicU64,
}

pub struct PubSubHandles {
    pub events: mpsc::UnboundedReceiver<PubSubMessage>,
    pub outgoing: mpsc::UnboundedReceiver<Message>,
}

impl PubSubClient {
    pub fn new(token: Arc<UserToken>) -> (PubSubHandles, Self) {
        let (sender, events) = mpsc::unbounded_channel::<PubSubMessage>();
        let (message_tx, outgoing) = mpsc::unbounded_channel();

        let client = Self {
            token,
            state: ConnectionState::new(),
            subscriptions: SubscriptionStore::new(),
            sender,
            message_tx,
            nonce: AtomicU64::new(0),
        };

        (PubSubHandles { events, outgoing }, client)
    }

    #[tracing::instrument(name = "pubsub_connect", skip_all)]
    pub async fn connect(
        &self,
        mut message_rx: mpsc::UnboundedReceiver<Message>,
    ) -> Result<(), Error> {
        let mut backoff = INITIAL_BACKOFF;

        loop {
            tracing::info!("Connecting to Twitch PubSub");

            let mut stream = match connect_async(TWITCH_PUBSUB_WS_URI).await {
                Ok((stream, _)) => stream,
                Err(err) => {
                    tracing::error!(%err, ?backoff, "Failed to connect to PubSub, retrying");
                    tokio::time::sleep(backoff).await;
                    backoff = (backoff * 2).min(MAX_BACKOFF);
                    continue;
                }
            };

            tracing::info!("Connected to Twitch PubSub");
            backoff = INITIAL_BACKOFF;

            self.state.set_connected(true);
            self.relisten_all().await;

            let mut ping_interval = tokio::time::interval(PING_INTERVAL);
            ping_interval.set_missed_tick_behavior(MissedTickBehavior::Skip);
            ping_interval.tick().await;

            self.send_ping();

            let mut pong_deadline = Some(Instant::now() + PONG_TIMEOUT);

            loop {
                let pong_timeout = async {
                    match pong_deadline {
                        Some(deadline) => tokio::time::sleep_until(deadline).await,
                        None => std::future::pending::<()>().await,
                    }
                };

                tokio::select! {
                    Some(data) = message_rx.recv() => {
                        if let Err(err) = stream.send(data).await {
                            tracing::error!(%err, "Error sending PubSub message");
                            break;
                        }
                    }
                    _ = ping_interval.tick() => {
                        self.send_ping();
                        pong_deadline = Some(Instant::now() + PONG_TIMEOUT);
                    }
                    _ = pong_timeout => {
                        tracing::warn!("No PONG received within timeout, reconnecting");
                        break;
                    }
                    result = stream.next() => {
                        match result {
                            Some(Ok(Message::Text(text))) => {
                                match serde_json::from_str::<Incoming>(&text) {
                                    Ok(msg) => match self.handle_message(msg).await {
                                        Action::Reconnect => break,
                                        Action::Pong => pong_deadline = None,
                                        Action::None => (),
                                    },
                                    Err(err) => {
                                        tracing::warn!(%err, "Failed to deserialize PubSub message");
                                    }
                                }
                            }
                            Some(Ok(Message::Ping(data))) => {
                                let _ = stream.send(Message::Pong(data)).await;
                            }
                            Some(Ok(Message::Close(frame))) => {
                                if let Some(frame) = frame {
                                    tracing::warn!(%frame, "PubSub connection closed");
                                }
                                break;
                            }
                            Some(Ok(_)) => (),
                            Some(Err(err)) => {
                                tracing::error!(%err, "PubSub WebSocket error");
                                break;
                            }
                            None => {
                                tracing::warn!("PubSub WebSocket stream ended unexpectedly");
                                break;
                            }
                        }
                    }
                }
            }

            self.state.set_connected(false);
            tracing::info!(?backoff, "Reconnecting to PubSub");
            tokio::time::sleep(backoff).await;
            backoff = (backoff * 2).min(MAX_BACKOFF);
        }
    }

    async fn handle_message(&self, msg: Incoming) -> Action {
        match msg {
            Incoming::Pong => {
                tracing::trace!("Received PONG");
                return Action::Pong;
            }
            Incoming::Reconnect => {
                tracing::warn!("PubSub server requested reconnect");
                return Action::Reconnect;
            }
            Incoming::Response { nonce, error } => {
                if error.is_empty() {
                    tracing::trace!(?nonce, "LISTEN acknowledged");
                } else {
                    tracing::error!(?nonce, %error, "PubSub request returned an error");
                }
            }
            Incoming::Message { data } => {
                let message = serde_json::from_str(&data.message).unwrap_or_else(|err| {
                    tracing::warn!(%err, "Failed to parse inner PubSub message, forwarding as string");
                    serde_json::Value::String(data.message.clone())
                });

                tracing::trace!(topic = %data.topic, "Received PubSub message");

                if self
                    .sender
                    .send(PubSubMessage {
                        topic: data.topic,
                        message,
                    })
                    .is_err()
                {
                    tracing::warn!("PubSub event receiver dropped");
                }
            }
            Incoming::AuthRevoked { data } => {
                tracing::warn!(topics = ?data.topics, "PubSub authorization revoked");

                for topic in data.topics {
                    self.subscriptions.remove_by(|t| *t == topic).await;
                }
            }
        }

        Action::None
    }

    fn next_nonce(&self) -> String {
        let n = self.nonce.fetch_add(1, Ordering::Relaxed);
        format!("hyperion-{n}")
    }

    fn send_ping(&self) {
        let payload = json!({ "type": "PING" });

        if self
            .message_tx
            .send(Message::Text(payload.to_string().into()))
            .is_err()
        {
            tracing::warn!("Failed to queue PubSub PING");
        }
    }

    fn send_listen(&self, command: &str, topics: &[String]) {
        let payload = json!({
            "type": command,
            "nonce": self.next_nonce(),
            "data": {
                "topics": topics,
                "auth_token": self.token.access_token.as_str(),
            }
        });

        if self
            .message_tx
            .send(Message::Text(payload.to_string().into()))
            .is_err()
        {
            tracing::error!("Failed to queue PubSub {command} message");
        }
    }

    async fn relisten_all(&self) {
        let drained = self.subscriptions.drain().await;

        if drained.is_empty() {
            return;
        }

        tracing::info!("Restoring {} PubSub topics", drained.len());

        let topics: Vec<String> = drained.iter().map(|(_, topic)| topic.clone()).collect();

        for chunk in topics.chunks(MAX_TOPICS_PER_LISTEN) {
            self.send_listen("LISTEN", chunk);
        }

        for (key, topic) in drained {
            let Some((channel, _)) = key.split_once(':') else {
                tracing::warn!("Malformed subscription key: {key}");
                continue;
            };

            self.subscriptions
                .insert(channel, &topic, topic.clone())
                .await;
        }
    }

    pub fn connected(&self) -> bool {
        self.state.connected()
    }

    #[tracing::instrument(name = "pubsub_listen", skip(self))]
    pub async fn subscribe(&self, channel: &str, topic: &str) {
        self.send_listen("LISTEN", std::slice::from_ref(&topic.to_string()));
        self.subscriptions
            .insert(channel, topic, topic.to_string())
            .await;

        tracing::trace!("Listening to topic");
    }

    pub async fn subscribe_all(&self, channel: &str, topics: &[String]) {
        let futures = topics.iter().map(|topic| self.subscribe(channel, topic));
        join_all(futures).await;
    }

    pub async fn unsubscribe(&self, channel: &str, topic: &str) {
        if self.subscriptions.remove(channel, topic).await.is_some() {
            self.send_listen("UNLISTEN", std::slice::from_ref(&topic.to_string()));
        }
    }

    pub async fn unsubscribe_all(&self, channel: &str) {
        let topics = self.subscriptions.events_for_channel(channel).await;
        let futures = topics.iter().map(|topic| self.unsubscribe(channel, topic));

        join_all(futures).await;
    }

    pub async fn resubscribe_all(&self, channel: &str) {
        let topics = self.subscriptions.events_for_channel(channel).await;

        for topic in &topics {
            self.send_listen("UNLISTEN", std::slice::from_ref(topic));
            self.send_listen("LISTEN", std::slice::from_ref(topic));
        }
    }
}
