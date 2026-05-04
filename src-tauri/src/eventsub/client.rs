use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use anyhow::anyhow;
use futures::future::join_all;
use futures::{SinkExt, StreamExt};
use serde::de::{DeserializeOwned, Error as DeError};
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::json;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::tungstenite::protocol::CloseFrame;
use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async};
use twitch_api::HelixClient;
use twitch_api::eventsub::{EventSubSubscription, EventType};
use twitch_api::twitch_oauth2::{TwitchToken, UserToken};

use crate::HTTP;
use crate::api::Response;
use crate::error::Error;
use crate::ws::{Backoff, ConnectionState, SubscriptionStore};

#[cfg(local)]
const TWITCH_EVENTSUB_WS_URI: &str = "ws://127.0.0.1:8080/ws";
#[cfg(local)]
const TWITCH_EVENTSUB_ENDPOINT: &str = "http://127.0.0.1:8080/eventsub/subscriptions";

#[cfg(not(local))]
const TWITCH_EVENTSUB_WS_URI: &str = "wss://eventsub.wss.twitch.tv/ws";
#[cfg(not(local))]
const TWITCH_EVENTSUB_ENDPOINT: &str = "https://api.twitch.tv/helix/eventsub/subscriptions";

const V2_EVENTS: [EventType; 4] = [
    EventType::AutomodMessageHold,
    EventType::AutomodMessageUpdate,
    EventType::ChannelModerate,
    EventType::ChannelPointsAutomaticRewardRedemptionAdd,
];

#[derive(Debug, Deserialize)]
enum MessageType {
    #[serde(rename = "session_welcome")]
    Welcome,
    #[serde(rename = "notification")]
    Notification,
    #[serde(rename = "session_reconnect")]
    Reconnect,
    #[serde(rename = "revocation")]
    Revocation,
    #[serde(rename = "session_keepalive")]
    Keepalive,
}

#[derive(Debug, Deserialize)]
pub struct MessageMetadata {
    message_type: MessageType,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Subscription {
    pub id: String,
    #[serde(rename = "type")]
    kind: EventType,
    condition: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct WebSocketSession {
    id: String,
    reconnect_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SessionPayload {
    session: WebSocketSession,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationPayload {
    subscription: Subscription,
    event: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct RevocationPayload {
    pub subscription: Subscription,
}

#[derive(Debug)]
pub enum WebSocketMessage {
    Welcome(SessionPayload),
    Notification(NotificationPayload),
    Reconnect(SessionPayload),
    Revocation(RevocationPayload),
    Keepalive,
}

#[derive(Deserialize)]
struct MessageDeserializer {
    metadata: MessageMetadata,
    payload: Option<serde_json::Value>,
}

fn parse_payload<T, E>(payload: serde_json::Value) -> Result<T, E>
where
    T: DeserializeOwned,
    E: DeError,
{
    T::deserialize(payload).map_err(DeError::custom)
}

impl<'de> Deserialize<'de> for WebSocketMessage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let message = MessageDeserializer::deserialize(deserializer)?;
        let payload = message.payload.unwrap_or(serde_json::Value::Null);

        match message.metadata.message_type {
            MessageType::Welcome => Ok(Self::Welcome(parse_payload(payload)?)),
            MessageType::Keepalive => Ok(Self::Keepalive),
            MessageType::Notification => Ok(Self::Notification(parse_payload(payload)?)),
            MessageType::Reconnect => Ok(Self::Reconnect(parse_payload(payload)?)),
            MessageType::Revocation => Ok(Self::Revocation(parse_payload(payload)?)),
        }
    }
}

pub struct EventSubClient {
    helix: Arc<HelixClient<'static, reqwest::Client>>,
    pub token: Arc<UserToken>,
    state: ConnectionState,
    pub subscriptions: SubscriptionStore<Subscription>,
    sender: mpsc::UnboundedSender<NotificationPayload>,
    reconnecting: AtomicBool,
}

type Stream = WebSocketStream<MaybeTlsStream<TcpStream>>;

impl EventSubClient {
    pub fn new(
        helix: Arc<HelixClient<'static, reqwest::Client>>,
        token: Arc<UserToken>,
    ) -> (mpsc::UnboundedReceiver<NotificationPayload>, Self) {
        let (sender, receiver) = mpsc::unbounded_channel::<NotificationPayload>();

        let client = Self {
            helix,
            token,
            state: ConnectionState::new(),
            subscriptions: SubscriptionStore::new(),
            sender,
            reconnecting: AtomicBool::default(),
        };

        (receiver, client)
    }

    #[tracing::instrument(name = "eventsub_connect", skip_all)]
    pub async fn connect(&self) -> Result<(), Error> {
        let mut backoff = Backoff::new();

        loop {
            tracing::info!("Connecting to EventSub");

            match connect_async(TWITCH_EVENTSUB_WS_URI).await {
                Ok((stream, _)) => {
                    tracing::info!("Connected to EventSub");

                    backoff.reset();
                    self.state.set_connected(true);
                    self.reconnecting.store(false, Ordering::SeqCst);

                    if let Err(err) = self.process_stream(stream).await {
                        tracing::error!(%err, "EventSub stream error");
                    }

                    self.state.set_connected(false);
                    self.state.set_session_id(None).await;
                }
                Err(err) => {
                    tracing::error!(%err, "Failed to connect to EventSub; retrying");
                }
            }

            backoff.sleep().await;
        }
    }

    async fn process_stream(&self, mut stream: Stream) -> Result<(), Error> {
        loop {
            match stream.next().await {
                Some(Ok(message)) => match message {
                    Message::Ping(data) => {
                        stream.send(Message::Pong(data)).await?;
                    }
                    Message::Text(data) => {
                        if let Some(new_stream) = self.handle_text(&data).await? {
                            let frame = CloseFrame {
                                code: CloseCode::Normal,
                                reason: "Reconnecting".into(),
                            };

                            if let Err(err) = stream.close(Some(frame)).await {
                                tracing::error!(%err, "Error closing old EventSub connection");
                            }

                            stream = new_stream;
                        }
                    }
                    Message::Close(frame) => {
                        if let Some(frame) = frame {
                            tracing::warn!(%frame, "EventSub connection closed");
                        } else {
                            tracing::warn!("EventSub connection closed");
                        }

                        break;
                    }
                    _ => (),
                },
                Some(Err(err)) => {
                    tracing::error!(%err, "EventSub connection error");
                    break;
                }
                None => {
                    tracing::warn!("EventSub connection closed, end of stream reached");
                    break;
                }
            }
        }

        Ok(())
    }

    async fn handle_text(&self, data: &str) -> Result<Option<Stream>, Error> {
        let msg: WebSocketMessage = match serde_json::from_str(data) {
            Ok(msg) => msg,
            Err(err) => {
                tracing::warn!(%err, "Failed to deserialize EventSub message");
                return Ok(None);
            }
        };

        let Some(url) = self.handle_message(msg).await? else {
            return Ok(None);
        };

        tracing::info!("Reconnecting to EventSub at {url}");
        Ok(Some(self.reconnect(&url).await?))
    }

    #[tracing::instrument(skip_all)]
    async fn handle_message(&self, msg: WebSocketMessage) -> Result<Option<String>, Error> {
        use WebSocketMessage as Ws;

        match msg {
            Ws::Welcome(payload) => {
                tracing::debug!("Set EventSub session id to {}", payload.session.id);
                self.state.set_session_id(Some(payload.session.id)).await;

                let was_reconnecting = self.reconnecting.swap(false, Ordering::Relaxed);

                if was_reconnecting {
                    tracing::info!("Reconnected to EventSub");
                } else {
                    tracing::info!("Initial connection to EventSub established");

                    let drained = self.subscriptions.drain().await;

                    if !drained.is_empty() {
                        tracing::info!("Restoring {} subscriptions", drained.len());
                    }

                    let to_restore: Vec<_> = drained
                        .into_iter()
                        .filter_map(|(key, sub)| {
                            let (username, _) = key.split_once(':')?;
                            Some((username.to_string(), sub.kind, sub.condition))
                        })
                        .collect();

                    self.subscribe(
                        self.token.login.as_str(),
                        EventType::UserUpdate,
                        json!({ "user_id": self.token.user_id }),
                    )
                    .await?;

                    for (username, kind, condition) in to_restore {
                        if kind == EventType::UserUpdate {
                            continue;
                        }

                        if let Err(err) = self.subscribe(&username, kind, condition).await {
                            tracing::error!(%err, "Failed to restore {kind} subscription");
                        }
                    }
                }
            }
            Ws::Notification(payload) => {
                tracing::trace!(
                    "Received {} event: {}",
                    payload.subscription.kind,
                    payload.event
                );

                if self.sender.send(payload).is_err() {
                    tracing::warn!("EventSub notification receiver dropped");
                }
            }
            Ws::Reconnect(payload) => {
                tracing::warn!("Reconnect requested for {}", payload.session.id);

                let Some(url) = payload.session.reconnect_url else {
                    return Err(Error::Generic(anyhow!(
                        "missing reconnect_url in reconnect payload"
                    )));
                };

                self.reconnecting.store(true, Ordering::Relaxed);

                return Ok(Some(url));
            }
            Ws::Revocation(payload) => {
                tracing::warn!(
                    "Revocation requested for {} ({})",
                    payload.subscription.kind,
                    payload.subscription.id
                );

                let id = &payload.subscription.id;
                if self
                    .subscriptions
                    .remove_by(|sub| sub.id == *id)
                    .await
                    .is_none()
                {
                    tracing::warn!("Revoked subscription {id} not found in store");
                }
            }
            Ws::Keepalive => (),
        }

        Ok(None)
    }

    async fn reconnect(&self, url: &str) -> Result<Stream, Error> {
        let (mut stream, _) = connect_async(url).await.map_err(Error::WebSocket)?;

        loop {
            match stream.next().await {
                Some(Ok(Message::Text(data))) => {
                    let msg = serde_json::from_str::<WebSocketMessage>(&data)
                        .map_err(|e| Error::Generic(anyhow::anyhow!(e)))?;

                    if let WebSocketMessage::Welcome(_) = msg {
                        self.handle_message(msg).await?;

                        tracing::info!("Switched to new EventSub connection");
                        return Ok(stream);
                    }

                    continue;
                }
                Some(Err(e)) => return Err(Error::WebSocket(e)),
                None => return Err(Error::Generic(anyhow!("New connection closed immediately"))),
                _ => continue,
            };
        }
    }

    pub fn connected(&self) -> bool {
        self.state.connected()
    }

    #[tracing::instrument(name = "eventsub_subscribe", skip(self, condition), fields(%condition))]
    pub async fn subscribe(
        &self,
        username: &str,
        event: EventType,
        condition: serde_json::Value,
    ) -> Result<(), Error> {
        let Some(session_id) = self.state.session_id().await else {
            return Err(Error::Generic(anyhow!("No EventSub connection")));
        };

        let version = if V2_EVENTS.contains(&event) { "2" } else { "1" };

        let body = json!({
            "type": event,
            "version": version,
            "condition": condition,
            "transport": {
                "method": "websocket",
                "session_id": session_id,
            }
        });

        let response: Response<(EventSubSubscription,)> = HTTP
            .post(TWITCH_EVENTSUB_ENDPOINT)
            .bearer_auth(self.token.access_token.as_str())
            .header("Client-Id", self.token.client_id().as_str())
            .json(&body)
            .send()
            .await?
            .json()
            .await?;

        self.subscriptions
            .insert(
                username,
                &event.to_string(),
                Subscription {
                    id: response.data.0.id.take(),
                    kind: event,
                    condition,
                },
            )
            .await;

        tracing::trace!("Subscription created");

        Ok(())
    }

    #[tracing::instrument(name = "eventsub_subscribe_all", skip(self, subscriptions))]
    pub async fn subscribe_all(
        &self,
        channel: &str,
        subscriptions: &[(EventType, &serde_json::Value)],
    ) -> Result<(), Error> {
        let futures = subscriptions
            .iter()
            .map(|&(event, condition)| self.subscribe(channel, event, condition.clone()));

        let results = join_all(futures).await;
        let total = results.len();
        let succeeded = results.iter().filter(|r| r.is_ok()).count();

        tracing::info!("{succeeded}/{total} subscriptions created");

        Ok(())
    }

    pub async fn unsubscribe(
        &self,
        channel: &str,
        event: &str,
    ) -> Result<Option<Subscription>, Error> {
        let subscription = self.subscriptions.remove(channel, event).await;

        if let Some(ref sub) = subscription {
            self.helix
                .delete_eventsub_subscription(&sub.id, &*self.token)
                .await?;
        }

        Ok(subscription)
    }

    pub async fn unsubscribe_all(
        &self,
        channel: &str,
    ) -> Result<Vec<(EventType, serde_json::Value)>, Error> {
        let events = self.subscriptions.events_for_channel(channel).await;

        let futures = events.iter().map(|event| self.unsubscribe(channel, event));

        let unsubscribed = join_all(futures)
            .await
            .into_iter()
            .filter_map(|r| r.ok().flatten())
            .map(|sub| (sub.kind, sub.condition))
            .collect();

        Ok(unsubscribed)
    }
}
