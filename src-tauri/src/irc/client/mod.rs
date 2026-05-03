pub(crate) mod event_loop;
mod pool_connection;

use std::sync::Arc;

use event_loop::{ClientLoopCommand, ClientLoopWorker};
use tokio::sync::{mpsc, oneshot};

use super::ClientConfig;
use super::message::ServerMessage;

#[derive(Debug, Clone)]
pub struct IrcClient {
    client_loop_tx: Arc<mpsc::UnboundedSender<ClientLoopCommand>>,
}

impl IrcClient {
    pub fn new(config: ClientConfig) -> (mpsc::UnboundedReceiver<ServerMessage>, Self) {
        let config = Arc::new(config);
        let (client_loop_tx, client_loop_rx) = mpsc::unbounded_channel();

        let client_loop_tx = Arc::new(client_loop_tx);
        let (client_incoming_messages_tx, client_incoming_messages_rx) = mpsc::unbounded_channel();

        ClientLoopWorker::spawn(config, client_loop_rx, client_incoming_messages_tx);

        (client_incoming_messages_rx, Self { client_loop_tx })
    }
}

impl IrcClient {
    pub async fn connect(&self) {
        let (return_tx, return_rx) = oneshot::channel();

        if self
            .client_loop_tx
            .send(ClientLoopCommand::Connect {
                return_sender: return_tx,
            })
            .is_err()
        {
            tracing::error!("IRC client loop has stopped");
            return;
        }

        if return_rx.await.is_err() {
            tracing::error!("IRC connect acknowledgment lost");
        }
    }

    pub fn join(&self, channel_login: String) {
        if self
            .client_loop_tx
            .send(ClientLoopCommand::Join { channel_login })
            .is_err()
        {
            tracing::warn!("IRC client loop has stopped, cannot join channel");
        }
    }

    pub fn part(&self, channel_login: String) {
        if self
            .client_loop_tx
            .send(ClientLoopCommand::Part { channel_login })
            .is_err()
        {
            tracing::warn!("IRC client loop has stopped, cannot part channel");
        }
    }
}
