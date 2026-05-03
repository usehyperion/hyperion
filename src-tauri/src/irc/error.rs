use std::sync::Arc;

use thiserror::Error;
use tokio_tungstenite::tungstenite::Error as WsError;

use super::message::IrcParseError;

#[derive(Error, Debug, Clone)]
pub enum Error {
    /// Underlying transport failed to connect
    #[error("Underlying transport failed to connect: {0}")]
    Connect(Arc<WsError>),
    /// Underlying transport failed to connect in time
    #[error("Underlying transport failed to connect: Connect timed out")]
    ConnectTimeout,
    /// Error received from incoming stream of messages
    #[error("Error received from incoming stream of messages: {0}")]
    Incoming(Arc<WsError>),
    /// Error received while trying to send message(s) out
    #[error("Error received while trying to send message(s) out: {0}")]
    Outgoing(Arc<WsError>),
    /// Incoming message was not valid IRC
    #[error("Incoming message was not valid IRC: {0}")]
    IrcParse(IrcParseError),
    /// Received RECONNECT command by IRC server
    #[error("Received RECONNECT command by IRC server")]
    ReconnectCmd,
    /// Did not receive a PONG back after sending PING
    #[error("Did not receive a PONG back after sending PING")]
    PingTimeout,
    /// Remote server unexpectedly closed connection
    #[error("Remote server unexpectedly closed connection")]
    RemoteUnexpectedlyClosedConnection,
}

