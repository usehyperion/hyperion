use std::future;

use either::Either;
use futures::stream::{self, FusedStream};
use futures::{Sink, SinkExt, StreamExt, TryStreamExt};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::{Error, Message};

use crate::irc::message::{IrcMessage, IrcParseError};

const TWITCH_IRC_WS_URI: &str = "wss://irc-ws.chat.twitch.tv";

pub type Incoming = Box<
    dyn FusedStream<Item = Result<IrcMessage, Either<Error, IrcParseError>>> + Unpin + Send + Sync,
>;

pub type Outgoing = Box<dyn Sink<IrcMessage, Error = Error> + Unpin + Send + Sync>;

pub struct WsTransport {
    incoming_messages: Incoming,
    outgoing_messages: Outgoing,
}

impl std::fmt::Debug for WsTransport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WsTransport").finish()
    }
}

impl WsTransport {
    #[tracing::instrument(name = "irc_ws_connect")]
    pub async fn new() -> Result<WsTransport, Error> {
        tracing::info!("Connecting to IRC at {TWITCH_IRC_WS_URI}");

        let ws_stream = match connect_async(TWITCH_IRC_WS_URI).await {
            Ok((stream, _)) => stream,
            Err(err) => {
                tracing::error!(%err, "Failed to connect to IRC");
                return Err(err);
            }
        };

        tracing::info!("Connected to IRC");

        let (write_half, read_half) = ws_stream.split();

        let message_stream = read_half
            .map_err(Either::Left)
            .try_filter_map(|ws_message| {
                future::ready(Ok::<_, Either<Error, IrcParseError>>(
                    if let Message::Text(text) = ws_message {
                        Some(stream::iter(
                            text.lines()
                                .map(|l| Ok(String::from(l)))
                                .collect::<Vec<Result<String, _>>>(),
                        ))
                    } else {
                        None
                    },
                ))
            })
            .try_flatten()
            .try_filter(|line| future::ready(!line.is_empty()))
            .and_then(|s| future::ready(IrcMessage::parse(&s).map_err(Either::Right)))
            .fuse();

        let message_sink = write_half
            .with(move |msg: IrcMessage| future::ready(Ok(Message::Text(msg.to_string().into()))));

        Ok(WsTransport {
            incoming_messages: Box::new(message_stream),
            outgoing_messages: Box::new(message_sink),
        })
    }

    pub fn split(self) -> (Incoming, Outgoing) {
        (self.incoming_messages, self.outgoing_messages)
    }
}
