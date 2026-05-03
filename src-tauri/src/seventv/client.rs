use anyhow::anyhow;
use futures::future::join_all;
use futures::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::json;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use crate::error::Error;
use crate::ws::{ConnectionState, SubscriptionStore};

const SEVENTV_WS_URI: &str = "wss://events.7tv.io/v3";

#[derive(Deserialize)]
struct WebSocketMessage {
    op: u8,
    d: serde_json::Value,
}

pub struct SeventTvClient {
    state: ConnectionState,
    subscriptions: SubscriptionStore<serde_json::Value>,
    sender: mpsc::UnboundedSender<serde_json::Value>,
    message_tx: mpsc::UnboundedSender<Message>,
    message_rx: Mutex<Option<mpsc::UnboundedReceiver<Message>>>,
}

impl SeventTvClient {
    pub fn new() -> (mpsc::UnboundedReceiver<serde_json::Value>, Self) {
        let (sender, receiver) = mpsc::unbounded_channel::<serde_json::Value>();
        let (message_tx, message_rx) = mpsc::unbounded_channel();

        let client = Self {
            subscriptions: SubscriptionStore::new(),
            state: ConnectionState::new(),
            sender,
            message_tx,
            message_rx: Mutex::new(Some(message_rx)),
        };

        (receiver, client)
    }

    #[tracing::instrument(name = "7tv_connect", skip_all)]
    pub async fn connect(&self) -> Result<(), Error> {
        let mut message_rx = self
            .message_rx
            .lock()
            .await
            .take()
            .ok_or_else(|| Error::Generic(anyhow!("Message receiver already taken")))?;

        loop {
            tracing::info!("Connecting to 7TV Event API");

            let mut stream = match connect_async(SEVENTV_WS_URI).await {
                Ok((stream, _)) => stream,
                Err(err) => {
                    tracing::error!(%err, "Failed to connect to 7TV Event API");
                    return Err(Error::WebSocket(err));
                }
            };

            tracing::info!("Connected to 7TV Event API");

            if let Some(id) = self.state.session_id().await {
                tracing::info!(%id, "Resuming 7TV session");

                let payload = json!({
                    "op": 34,
                    "d": {
                        "session_id": id
                    }
                });

                if let Err(err) = stream.send(Message::Text(payload.to_string().into())).await {
                    tracing::error!(%err, "Error sending resume message");
                }
            }

            self.state.set_connected(true);

            loop {
                tokio::select! {
                    Some(data) = message_rx.recv() => {
                        if let Err(err) = stream.send(data).await {
                            tracing::error!(%err, "Error sending message");
                            break;
                        }
                    }
                    result = stream.next() => {
                        match result {
                            Some(Ok(message)) => match message {
                                Message::Text(text) => {
                                    match serde_json::from_str::<WebSocketMessage>(&text) {
                                        Ok(msg) => self.handle_ws_message(msg).await,
                                        Err(err) => tracing::warn!(%err, "Failed to deserialize 7TV message"),
                                    }
                                }
                                Message::Close(cf) => {
                                    if let Some(frame) = cf {
                                        tracing::warn!(%frame, "Event API connection closed");
                                    }

                                    break;
                                }
                                _ => (),
                            },
                            Some(Err(err)) => {
                                tracing::error!(%err, "7TV WebSocket error");
                                break;
                            }
                            None => {
                                tracing::warn!("7TV WebSocket stream ended unexpectedly");
                                break;
                            }
                        }
                    }
                }
            }

            self.state.set_connected(false);
        }
    }

    async fn handle_ws_message(&self, msg: WebSocketMessage) {
        match msg.op {
            0 => {
                if self.sender.send(msg.d).is_err() {
                    tracing::warn!("7TV event receiver dropped");
                }
            }
            1 => {
                if let Some(id) = msg.d["session_id"].as_str() {
                    self.state.set_session_id(Some(id.to_string())).await;
                    tracing::info!(%id, "Hello received, session established");
                }
            }
            5 => {
                tracing::debug!(payload = ?msg.d.to_string(), "Opcode acknowledged");

                if let Some(false) = msg.d["data"]["success"].as_bool() {
                    let to_restore = self.subscriptions.drain().await;

                    tracing::warn!(
                        "Resume unsuccessful, restoring {} events",
                        to_restore.len()
                    );

                    for (key, condition) in to_restore {
                        let Some((channel, event)) = key.split_once(':') else {
                            tracing::warn!("Malformed subscription key: {key}");
                            continue;
                        };

                        self.subscribe(channel, event, &condition).await;
                    }
                }
            }
            7 => {
                tracing::info!(payload = ?msg.d.to_string(), "End of stream reached");
            }
            _ => {}
        }
    }

    pub fn connected(&self) -> bool {
        self.state.connected()
    }

    #[tracing::instrument(name = "7tv_subscribe", skip(self, condition), fields(%condition))]
    pub async fn subscribe(&self, channel: &str, event: &str, condition: &serde_json::Value) {
        let payload = json!({
            "op": 35,
            "d": {
                "type": event,
                "condition": condition
            }
        });

        match self
            .message_tx
            .send(Message::Text(payload.to_string().into()))
        {
            Ok(_) => {
                self.subscriptions
                    .insert(channel, event, condition.clone())
                    .await;

                tracing::trace!("Subscription created");
            }
            Err(err) => {
                tracing::error!(%err, "Failed to send subscription message");
            }
        }
    }

    pub async fn unsubscribe(&self, channel: &str, event: &str) {
        if let Some(condition) = self.subscriptions.remove(channel, event).await {
            let payload = json!({
                "op": 36,
                "d": {
                    "type": event,
                    "condition": condition
                }
            });

            let _ = self
                .message_tx
                .send(Message::Text(payload.to_string().into()));
        }
    }

    pub async fn unsubscribe_all(&self, channel: &str) {
        let events = self.subscriptions.events_for_channel(channel).await;
        let futures = events.iter().map(|event| self.unsubscribe(channel, event));

        join_all(futures).await;
    }
}
