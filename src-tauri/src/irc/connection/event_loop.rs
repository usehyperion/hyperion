use std::collections::VecDeque;
use std::sync::Arc;

use either::Either;
use futures::{SinkExt, StreamExt};
use tokio::sync::{mpsc, oneshot};
use tokio::time::{Duration, Instant, interval_at};

use super::ConnectionIncomingMessage;
use crate::irc::message::{IrcMessage, ServerMessage};
use crate::irc::websocket::{self, Incoming, Outgoing};
use crate::irc::{ClientConfig, Error};
use crate::{irc, ws};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(20);

const PING_EVERY: Duration = Duration::from_secs(30);
const PONG_TIMEOUT: Duration = Duration::from_secs(5);

/// How long a connection holds the client's rate limiter after connecting.
const NEW_CONNECTION_EVERY: Duration = Duration::from_secs(2);

pub(crate) type ReplySender = oneshot::Sender<Result<(), Error>>;
pub(crate) type PendingMessage = (IrcMessage, Option<ReplySender>);

async fn close_with_error(
    err: Error,
    pending: VecDeque<PendingMessage>,
    mut connection_loop_rx: mpsc::UnboundedReceiver<PendingMessage>,
    connection_incoming_tx: &mpsc::UnboundedSender<ConnectionIncomingMessage>,
) {
    for (_msg, reply) in pending {
        if let Some(reply) = reply {
            reply.send(Err(err.clone())).ok();
        }
    }

    connection_incoming_tx
        .send(ConnectionIncomingMessage::StateClosed)
        .ok();

    // Keep accepting commands until all senders are dropped so callers that
    // race a transport error with `send(...).unwrap()` don't panic. Reply with
    // the close error when a reply channel was provided; otherwise drop.
    while let Some((_, reply)) = connection_loop_rx.recv().await {
        if let Some(reply) = reply {
            reply.send(Err(err.clone())).ok();
        }
    }
}

async fn establish_transport(config: Arc<ClientConfig>) -> Result<(Incoming, Outgoing), Error> {
    let mut backoff = Arc::clone(&config.connection_rate_limiter)
        .lock_owned()
        .await;

    let transport = tokio::select! {
        t_result = websocket::connect() => {
            t_result.map_err(Arc::new).map_err(Error::Connect)
        },
        _ = tokio::time::sleep(CONNECT_TIMEOUT) => {
            Err(Error::ConnectTimeout)
        }
    };

    // The next connection waits for the limiter, so holding it is what spaces
    // out connects, and what keeps a failing one from being retried at once
    let hold = match &transport {
        Ok(_) => {
            backoff.reset();
            NEW_CONNECTION_EVERY
        }
        Err(err) => {
            let retry_in = backoff.next_delay().max(NEW_CONNECTION_EVERY);
            tracing::error!(%err, ?retry_in, "Failed to connect to IRC");

            retry_in
        }
    };

    tokio::spawn(async move {
        tokio::time::sleep(hold).await;
        drop(backoff);
    });

    transport
}

pub(crate) async fn run(
    config: Arc<ClientConfig>,
    connection_incoming_tx: mpsc::UnboundedSender<ConnectionIncomingMessage>,
    mut connection_loop_rx: mpsc::UnboundedReceiver<PendingMessage>,
) {
    // Connect while buffering any commands from callers
    let mut pending: VecDeque<PendingMessage> = VecDeque::new();

    let init_fut = establish_transport(Arc::clone(&config));
    tokio::pin!(init_fut);

    let init_result = loop {
        tokio::select! {
            res = &mut init_fut => break res,
            cmd = connection_loop_rx.recv() => {
                match cmd {
                    Some((msg, reply)) => {
                        pending.push_back((msg, reply));
                    }
                    None => {
                        // Parent dropped before connect finished. Bail without
                        // emitting a state-closed (no consumer cares).
                        return;
                    }
                }
            }
        }
    };

    let (mut transport_incoming, mut transport_outgoing) = match init_result {
        Ok(transport) => transport,
        Err(err) => {
            close_with_error(err, pending, connection_loop_rx, &connection_incoming_tx).await;
            return;
        }
    };

    macro_rules! send_or_close {
        ($msg:expr, $reply:expr) => {{
            let res = transport_outgoing.send($msg).await.map_err(Arc::new);
            let reply: Option<ReplySender> = $reply;

            match res {
                Ok(()) => {
                    if let Some(reply) = reply {
                        reply.send(Ok(())).ok();
                    }

                    Ok(())
                }
                Err(err) => {
                    let outgoing_err = Error::Outgoing(Arc::clone(&err));

                    if let Some(reply) = reply {
                        reply.send(Err(outgoing_err.clone())).ok();
                    }

                    Err(outgoing_err)
                }
            }
        }};
    }

    let handshake = [
        irc!["CAP", "REQ", "twitch.tv/tags twitch.tv/commands"],
        irc!["PASS", format!("oauth:{}", config.token)],
        irc!["NICK", config.login.as_str()],
    ];

    for msg in handshake {
        if let Err(err) = send_or_close!(msg, None) {
            close_with_error(err, pending, connection_loop_rx, &connection_incoming_tx).await;
            return;
        }
    }

    while let Some((msg, reply)) = pending.pop_front() {
        if let Err(err) = send_or_close!(msg, reply) {
            close_with_error(err, pending, connection_loop_rx, &connection_incoming_tx).await;
            return;
        }
    }

    let mut ping_interval = interval_at(Instant::now() + PING_EVERY, PING_EVERY);
    let mut pong_deadline = None;

    let close_reason: Error = loop {
        tokio::select! {
            biased;
            () = ws::deadline_elapsed(pong_deadline) => break Error::PingTimeout,
            _ = ping_interval.tick() => {
                pong_deadline = Some(Instant::now() + PONG_TIMEOUT);

                if let Err(err) = send_or_close!(irc!["PING", "tmi.twitch.tv"], None) {
                    break err;
                }
            }
            cmd = connection_loop_rx.recv() => {
                match cmd {
                    Some((msg, reply)) => {
                        if let Err(err) = send_or_close!(msg, reply) {
                            break err;
                        }
                    }
                    None => {
                        // Parent dropped; quit cleanly without emitting a
                        // state-closed (consumer is gone)
                        return;
                    }
                }
            }
            incoming = transport_incoming.next() => {
                match incoming {
                    None => break Error::RemoteUnexpectedlyClosedConnection,
                    Some(Err(e)) => {
                        let err = match e {
                            Either::Left(e) => Error::Incoming(Arc::new(e)),
                            Either::Right(e) => Error::IrcParse(e),
                        };
                        break err;
                    }
                    Some(Ok(irc_message)) => {
                        tracing::trace!(
                            tags = ?irc_message.tags,
                            "Received {} message",
                            irc_message.command
                        );

                        match ServerMessage::parse(irc_message) {
                            Ok(None) => {}
                            Ok(Some(server_message)) => {
                                match &server_message {
                                    ServerMessage::Ping => {
                                        if let Err(err) = send_or_close!(
                                            irc!["PONG", "tmi.twitch.tv"],
                                            None
                                        ) {
                                            break err;
                                        }
                                    }
                                    ServerMessage::Pong => pong_deadline = None,
                                    _ => {}
                                }

                                let should_close = matches!(server_message, ServerMessage::Reconnect);

                                connection_incoming_tx
                                    .send(ConnectionIncomingMessage::IncomingMessage(Box::new(
                                        server_message,
                                    )))
                                    .ok();

                                if should_close {
                                    break Error::ReconnectCmd;
                                }
                            }
                            Err(err) => {
                                tracing::warn!(%err, "Failed to parse IRC message");
                            }
                        }
                    }
                }
            }
        }
    };

    close_with_error(
        close_reason,
        VecDeque::new(),
        connection_loop_rx,
        &connection_incoming_tx,
    )
    .await;
}
