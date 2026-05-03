pub mod event_loop;

use std::sync::Arc;

use tokio::sync::mpsc;

use super::config::ClientConfig;
use super::connection::event_loop::{ConnectionLoopWorker, PendingMessage};
use super::message::commands::ServerMessage;

#[derive(Debug)]
pub enum ConnectionIncomingMessage {
    IncomingMessage(Box<ServerMessage>),
    StateClosed,
}

pub(crate) struct Connection {
    pub connection_loop_tx: Arc<mpsc::UnboundedSender<PendingMessage>>,
}

impl Connection {
    pub fn new(
        config: Arc<ClientConfig>,
    ) -> (
        mpsc::UnboundedReceiver<ConnectionIncomingMessage>,
        Connection,
    ) {
        let (connection_loop_tx, connection_loop_rx) = mpsc::unbounded_channel();
        let (connection_incoming_tx, connection_incoming_rx) = mpsc::unbounded_channel();
        let connection_loop_tx = Arc::new(connection_loop_tx);

        ConnectionLoopWorker::spawn(config, connection_incoming_tx, connection_loop_rx);

        (connection_incoming_rx, Connection { connection_loop_tx })
    }
}
