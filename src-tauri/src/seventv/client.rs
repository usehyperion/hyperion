use std::sync::Arc;
use std::time::Duration;

use futures::FutureExt;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::mpsc;

use crate::connection::Started;
use crate::ws::{self, Changes, Flow, Link, Protocol, SubscriptionStore, WsError};

/// Assumed until the server's hello says otherwise.
const DEFAULT_HEARTBEAT_INTERVAL: Duration = Duration::from_secs(25);

/// How late a heartbeat may be before the connection counts as dead.
const HEARTBEAT_GRACE: Duration = Duration::from_secs(10);

mod op {
    pub const DISPATCH: u8 = 0;
    pub const HELLO: u8 = 1;
    pub const HEARTBEAT: u8 = 2;
    pub const RECONNECT: u8 = 4;
    pub const ACK: u8 = 5;
    pub const ERROR: u8 = 6;
    pub const END_OF_STREAM: u8 = 7;
    pub const RESUME: u8 = 34;
    pub const SUBSCRIBE: u8 = 35;
    pub const UNSUBSCRIBE: u8 = 36;
}

#[derive(Deserialize)]
struct Envelope {
    op: u8,
    #[serde(default)]
    d: serde_json::Value,
}

#[derive(Deserialize)]
struct Hello {
    session_id: String,
    heartbeat_interval: Option<u64>,
}

pub struct SeventTvClient {
    subscriptions: SubscriptionStore<serde_json::Value>,
}

impl SeventTvClient {
    pub fn start() -> Started<Self> {
        let client = Arc::new(Self {
            subscriptions: SubscriptionStore::default(),
        });

        let (events_tx, events) = mpsc::unbounded_channel();

        let driver = SeventTvDriver {
            client: Arc::clone(&client),
            events: events_tx,
            session_id: None,
            resuming: None,
            heartbeat_timeout: DEFAULT_HEARTBEAT_INTERVAL + HEARTBEAT_GRACE,
        };

        Started {
            client,
            events,
            run: Some(ws::run(driver).boxed()),
        }
    }

    /// Replaces the events subscribed to for `channel`.
    pub fn set_channel(&self, channel: &str, events: Vec<(String, serde_json::Value)>) {
        self.subscriptions.set_channel(channel, events);
    }

    pub fn leave(&self, channel: &str) {
        self.subscriptions.remove_channel(channel);
    }
}

struct SeventTvDriver {
    client: Arc<SeventTvClient>,
    events: mpsc::UnboundedSender<serde_json::Value>,
    /// The last session that became ready. Resuming it after a drop keeps its
    /// subscriptions and replays the events missed in between.
    session_id: Option<String>,
    /// This connection's session, while waiting to hear whether resuming
    /// `session_id` worked.
    resuming: Option<String>,
    heartbeat_timeout: Duration,
}

impl SeventTvDriver {
    async fn hello(&mut self, hello: Hello, link: &mut Link) -> Result<Flow, WsError> {
        if let Some(interval) = hello.heartbeat_interval {
            self.heartbeat_timeout = Duration::from_millis(interval) + HEARTBEAT_GRACE;
            link.expect_within(self.heartbeat_timeout);
        }

        let Some(previous) = &self.session_id else {
            tracing::info!(id = %hello.session_id, "Session established");
            self.session_id = Some(hello.session_id);

            return Ok(Flow::Ready { restored: false });
        };

        tracing::info!(%previous, "Resuming session");

        link.send(&json!({
            "op": op::RESUME,
            "d": { "session_id": previous }
        }))
        .await?;

        self.resuming = Some(hello.session_id);

        Ok(Flow::Continue)
    }

    fn resumed(&mut self, session_id: String, restored: bool) -> Flow {
        if restored {
            tracing::info!(id = %session_id, "Session resumed");
        } else {
            tracing::warn!(id = %session_id, "Resume unsuccessful, resubscribing");
        }

        self.session_id = Some(session_id);

        Flow::Ready { restored }
    }
}

impl Protocol for SeventTvDriver {
    type Subscription = serde_json::Value;

    const NAME: &'static str = "7TV";
    const URI: &'static str = "wss://events.7tv.io/v3";

    fn subscriptions(&self) -> &SubscriptionStore<serde_json::Value> {
        &self.client.subscriptions
    }

    fn opened(&mut self, link: &mut Link) -> Flow {
        self.resuming = None;
        link.expect_within(self.heartbeat_timeout);

        Flow::Continue
    }

    async fn received(&mut self, text: &str, link: &mut Link) -> Result<Flow, WsError> {
        let Envelope { op, d } = match serde_json::from_str(text) {
            Ok(envelope) => envelope,
            Err(err) => {
                tracing::warn!(%err, "Failed to deserialize 7TV message");
                return Ok(Flow::Continue);
            }
        };

        // Heartbeats are what the server promises, but anything it sends shows
        // the connection is alive
        link.expect_within(self.heartbeat_timeout);

        match op {
            op::DISPATCH => {
                if self.events.send(d).is_err() {
                    tracing::warn!("7TV event receiver dropped");
                }
            }
            op::HELLO => match serde_json::from_value(d) {
                Ok(hello) => return self.hello(hello, link).await,
                Err(err) => {
                    tracing::error!(%err, "Malformed hello");
                    return Ok(Flow::Reconnect);
                }
            },
            op::HEARTBEAT => tracing::trace!("Heartbeat received"),
            op::RECONNECT => {
                tracing::warn!("7TV server requested reconnect");
                return Ok(Flow::Reconnect);
            }
            op::ACK => match self.resuming.take() {
                // Nothing is subscribed while resuming, so this acknowledges it
                Some(session_id) => {
                    let restored = d["data"]["success"].as_bool().unwrap_or(false);
                    return Ok(self.resumed(session_id, restored));
                }
                None => tracing::debug!(payload = %d, "Opcode acknowledged"),
            },
            op::ERROR => {
                tracing::error!(payload = %d, "7TV returned an error");

                // In place of the resume's ack, it means resuming failed
                if let Some(session_id) = self.resuming.take() {
                    return Ok(self.resumed(session_id, false));
                }
            }
            op::END_OF_STREAM => {
                tracing::warn!(payload = %d, "End of stream reached");
                return Ok(Flow::Reconnect);
            }
            _ => tracing::debug!(op, "Unhandled 7TV opcode"),
        }

        Ok(Flow::Continue)
    }

    async fn sync(
        &mut self,
        changes: &Changes<serde_json::Value>,
        link: &mut Link,
    ) -> Result<(), WsError> {
        let removed = changes.removed.iter().map(|entry| (op::UNSUBSCRIBE, entry));
        let added = changes.added.iter().map(|entry| (op::SUBSCRIBE, entry));

        for (op, (key, condition)) in removed.chain(added) {
            link.send(&json!({
                "op": op,
                "d": {
                    "type": key.event,
                    "condition": condition
                }
            }))
            .await?;
        }

        Ok(())
    }
}
