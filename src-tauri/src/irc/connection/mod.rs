mod event_loop;

use std::sync::Arc;

pub(super) use event_loop::{PendingMessage, ReplySender};
use tokio::sync::mpsc;

use super::config::ClientConfig;
use super::message::ServerMessage;

#[derive(Debug)]
pub enum ConnectionIncomingMessage {
    IncomingMessage(Box<ServerMessage>),
    StateClosed,
}

/// Opens a single IRC connection, returning its incoming messages and the
/// sender for messages to send out on it.
pub fn spawn(
    config: Arc<ClientConfig>,
) -> (
    mpsc::UnboundedReceiver<ConnectionIncomingMessage>,
    mpsc::UnboundedSender<PendingMessage>,
) {
    let (connection_loop_tx, connection_loop_rx) = mpsc::unbounded_channel();
    let (connection_incoming_tx, connection_incoming_rx) = mpsc::unbounded_channel();

    tokio::spawn(event_loop::run(
        config,
        connection_incoming_tx,
        connection_loop_rx,
    ));

    (connection_incoming_rx, connection_loop_tx)
}
