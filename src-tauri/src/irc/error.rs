use std::sync::Arc;

use thiserror::Error;
use tokio_tungstenite::tungstenite::Error as WsError;

use super::message::IrcParseError;

#[derive(Error, Debug, Clone)]
pub enum Error {
    #[error("Underlying transport failed to connect: {0}")]
    Connect(Arc<WsError>),
    #[error("Underlying transport failed to connect: Connect timed out")]
    ConnectTimeout,
    #[error("Error received from incoming stream of messages: {0}")]
    Incoming(Arc<WsError>),
    #[error("Error received while trying to send message(s) out: {0}")]
    Outgoing(Arc<WsError>),
    #[error("Incoming message was not valid IRC: {0}")]
    IrcParse(IrcParseError),
    #[error("Received RECONNECT command by IRC server")]
    ReconnectCmd,
    #[error("Did not receive a PONG back after sending PING")]
    PingTimeout,
    #[error("Remote server unexpectedly closed connection")]
    RemoteUnexpectedlyClosedConnection,
    #[error("IRC client stopped before the message was sent")]
    ClientClosed,
}
