use std::sync::Arc;
use std::time::Duration;

use futures::FutureExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::mpsc;
use twitch_oauth2::UserToken;

use super::{channel_topics, user_topics};
use crate::connection::Started;
use crate::ws::{self, Changes, Flow, Keepalive, Link, Protocol, SubscriptionStore, WsError};

const MAX_TOPICS_PER_LISTEN: usize = 50;

#[derive(Debug, Serialize)]
pub struct PubSubMessage {
    /// The topic's name without its ids, e.g. `chat_moderator_actions`.
    topic: String,
    /// The last id of the full topic, i.e. the channel for channel topics and
    /// the user for user topics.
    target_id: String,
    message: serde_json::Value,
}

/// Splits a full topic into its name and its last id.
fn split_topic(full_topic: &str) -> (&str, &str) {
    let (topic, ids) = full_topic.split_once('.').unwrap_or((full_topic, ""));
    let target_id = ids.rsplit('.').next().unwrap_or_default();

    (topic, target_id)
}

impl PubSubMessage {
    fn new(full_topic: &str, message: serde_json::Value) -> Self {
        let (topic, target_id) = split_topic(full_topic);

        Self {
            topic: topic.to_owned(),
            target_id: target_id.to_owned(),
            message,
        }
    }

    /// Tells the frontend that the server stopped sending `full_topic`, e.g.
    /// after the user was banned or lost moderator status in the channel.
    fn auth_revoked(full_topic: &str) -> Self {
        let (topic, target_id) = split_topic(full_topic);

        Self {
            topic: "auth_revoked".to_owned(),
            target_id: target_id.to_owned(),
            message: json!({ "topic": topic }),
        }
    }
}

#[derive(Debug, Deserialize)]
struct MessageData {
    topic: String,
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

/// The topics the app wants to listen to. Keyed by owner (the session or a
/// channel login) and full topic, which is all a listen needs, so there is no
/// value.
pub struct PubSubClient {
    user_id: String,
    subscriptions: SubscriptionStore<()>,
}

impl PubSubClient {
    pub fn start(token: UserToken) -> Started<Self> {
        let user_id = token.user_id.to_string();
        let subscriptions = SubscriptionStore::default();

        subscriptions.set_session(user_topics(&user_id).into_iter().map(|topic| (topic, ())));

        let client = Arc::new(Self {
            user_id,
            subscriptions,
        });

        let (events_tx, events) = mpsc::unbounded_channel();

        let driver = PubSubDriver {
            client: Arc::clone(&client),
            token,
            events: events_tx,
            nonce: 0,
        };

        Started {
            client,
            events,
            run: Some(ws::run(driver).boxed()),
        }
    }

    /// Listens to the channel topics for `channel_id`, keyed by the channel's
    /// login. Calling it again recomputes them, e.g. after `is_mod` changed or
    /// topics were revoked.
    #[tracing::instrument(name = "pubsub_listen", skip(self))]
    pub fn listen(&self, channel: &str, channel_id: &str, is_mod: bool) {
        let topics = channel_topics(&self.user_id, channel_id, is_mod);

        tracing::trace!("Listening to {} topics", topics.len());

        self.subscriptions
            .set_channel(channel, topics.into_iter().map(|topic| (topic, ())));
    }

    #[tracing::instrument(name = "pubsub_unlisten", skip(self))]
    pub fn unlisten(&self, channel: &str) {
        self.subscriptions.remove_channel(channel);
    }
}

/// Owns the connection-side state, and the sender for its events so they end
/// when the connection is stopped.
struct PubSubDriver {
    client: Arc<PubSubClient>,
    token: UserToken,
    events: mpsc::UnboundedSender<PubSubMessage>,
    nonce: u64,
}

impl PubSubDriver {
    async fn send_listen(
        &mut self,
        link: &mut Link,
        command: &str,
        topics: &[&str],
    ) -> Result<(), WsError> {
        self.nonce += 1;

        let payload = json!({
            "type": command,
            "nonce": format!("hyperion-{}", self.nonce),
            "data": {
                "topics": topics,
                "auth_token": self.token.access_token.as_str(),
            }
        });

        link.send(&payload).await
    }

    fn forward(&self, data: MessageData) {
        let message = match serde_json::from_str(&data.message) {
            Ok(message) => message,
            Err(err) => {
                tracing::warn!(%err, topic = %data.topic, "Dropping unparseable PubSub message");
                return;
            }
        };

        tracing::trace!(topic = %data.topic, "Received PubSub message");

        self.emit(PubSubMessage::new(&data.topic, message));
    }

    fn emit(&self, message: PubSubMessage) {
        if self.events.send(message).is_err() {
            tracing::warn!("PubSub event receiver dropped");
        }
    }
}

impl Protocol for PubSubDriver {
    type Subscription = ();

    const NAME: &'static str = "PubSub";
    const URI: &'static str = "wss://pubsub-edge.twitch.tv";
    const KEEPALIVE: Option<Keepalive> = Some(Keepalive {
        every: Duration::from_secs(240),
        timeout: Duration::from_secs(10),
        ping: r#"{"type":"PING"}"#,
    });

    fn subscriptions(&self) -> &SubscriptionStore<()> {
        &self.client.subscriptions
    }

    fn opened(&mut self, _link: &mut Link) -> Flow {
        Flow::Ready { restored: false }
    }

    async fn received(&mut self, text: &str, link: &mut Link) -> Result<Flow, WsError> {
        let message = match serde_json::from_str::<Incoming>(text) {
            Ok(message) => message,
            Err(err) => {
                tracing::warn!(%err, "Failed to deserialize PubSub message");
                return Ok(Flow::Continue);
            }
        };

        match message {
            Incoming::Pong => {
                tracing::trace!("Received PONG");
                link.clear_deadline();
            }
            Incoming::Reconnect => {
                tracing::warn!("PubSub server requested reconnect");
                return Ok(Flow::Reconnect);
            }
            Incoming::Response { nonce, error } => {
                if error.is_empty() {
                    tracing::trace!(?nonce, "Request acknowledged");
                } else {
                    tracing::error!(?nonce, %error, "PubSub request returned an error");
                }
            }
            Incoming::Message { data } => self.forward(data),
            Incoming::AuthRevoked { data } => {
                tracing::warn!(topics = ?data.topics, "PubSub authorization revoked");

                self.client
                    .subscriptions
                    .revoke(|key| data.topics.contains(&key.event));

                for topic in &data.topics {
                    self.emit(PubSubMessage::auth_revoked(topic));
                }
            }
        }

        Ok(Flow::Continue)
    }

    async fn sync(&mut self, changes: &Changes<()>, link: &mut Link) -> Result<(), WsError> {
        for (command, entries) in [("UNLISTEN", &changes.removed), ("LISTEN", &changes.added)] {
            let topics: Vec<&str> = entries.iter().map(|(key, ())| key.event.as_str()).collect();

            for chunk in topics.chunks(MAX_TOPICS_PER_LISTEN) {
                self.send_listen(link, command, chunk).await?;
            }
        }

        Ok(())
    }
}
