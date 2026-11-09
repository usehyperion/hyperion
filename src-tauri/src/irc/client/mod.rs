mod event_loop;
mod pool_connection;

use std::sync::Arc;

use event_loop::{ClientLoopCommand, ClientLoopWorker};
use tokio::sync::{mpsc, oneshot};

use super::ClientConfig;
use super::error::Error;
use super::message::ServerMessage;

#[derive(Debug)]
pub struct IrcClient {
    client_loop_tx: mpsc::UnboundedSender<ClientLoopCommand>,
}

impl IrcClient {
    /// Creates a client and opens its first connection.
    pub fn new(config: ClientConfig) -> (mpsc::UnboundedReceiver<ServerMessage>, Self) {
        let (client_loop_tx, client_loop_rx) = mpsc::unbounded_channel();
        let (client_incoming_messages_tx, client_incoming_messages_rx) = mpsc::unbounded_channel();

        ClientLoopWorker::spawn(
            Arc::new(config),
            client_loop_rx,
            client_incoming_messages_tx,
        );

        (client_incoming_messages_rx, Self { client_loop_tx })
    }

    pub fn active(&self) -> bool {
        !self.client_loop_tx.is_closed()
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

    pub async fn privmsg(&self, channel_login: String, message: String) -> Result<(), Error> {
        let (return_tx, return_rx) = oneshot::channel();

        self.client_loop_tx
            .send(ClientLoopCommand::Privmsg {
                channel_login,
                message,
                return_sender: return_tx,
            })
            .map_err(|_| Error::ClientClosed)?;

        return_rx.await.map_err(|_| Error::ClientClosed)?
    }
}
