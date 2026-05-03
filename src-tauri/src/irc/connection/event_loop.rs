use std::collections::VecDeque;
use std::sync::Arc;

use either::Either;
use futures::{SinkExt, StreamExt};
use tokio::sync::{mpsc, oneshot};
use tokio::time::{Duration, Instant, interval_at};

use super::ConnectionIncomingMessage;
use crate::irc;
use crate::irc::message::{IrcMessage, ServerMessage};
use crate::irc::websocket::WsTransport;
use crate::irc::{ClientConfig, Error};

/// Public command type accepted by the connection loop. Only `SendMessage` is
/// exposed to callers; the loop is otherwise driven by its own internal
/// timers and the underlying transport.
type ReplySender = oneshot::Sender<Result<(), Error>>;
type PendingMessage = (IrcMessage, Option<ReplySender>);

#[derive(Debug)]
pub(crate) enum ConnectionLoopCommand {
    SendMessage(IrcMessage, Option<ReplySender>),
}

pub(crate) struct ConnectionLoopWorker;

impl ConnectionLoopWorker {
    pub fn spawn(
        config: Arc<ClientConfig>,
        connection_incoming_tx: mpsc::UnboundedSender<ConnectionIncomingMessage>,
        connection_loop_rx: mpsc::UnboundedReceiver<ConnectionLoopCommand>,
    ) {
        tokio::spawn(run(config, connection_incoming_tx, connection_loop_rx));
    }
}

async fn close_with_error(
    err: Error,
    pending: VecDeque<PendingMessage>,
    mut connection_loop_rx: mpsc::UnboundedReceiver<ConnectionLoopCommand>,
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
    while let Some(ConnectionLoopCommand::SendMessage(_, reply)) = connection_loop_rx.recv().await {
        if let Some(reply) = reply {
            reply.send(Err(err.clone())).ok();
        }
    }
}

async fn establish_transport(
    config: Arc<ClientConfig>,
) -> Result<(WsTransport, String, String), Error> {
    let login = config.login.clone();
    let token = config.token.clone();

    let rate_limit_permit = Arc::clone(&config.connection_rate_limiter)
        .acquire_owned()
        .await;

    let connect_attempt = WsTransport::new();
    let timeout = tokio::time::sleep(config.connect_timeout);

    let transport = tokio::select! {
        t_result = connect_attempt => {
            t_result.map_err(Arc::new).map_err(Error::Connect)
        },
        _ = timeout => {
            Err(Error::ConnectTimeout)
        }
    }?;

    let new_connection_every = config.new_connection_every;

    tokio::spawn(async move {
        tokio::time::sleep(new_connection_every).await;
        drop(rate_limit_permit);
    });

    Ok((transport, login, token))
}

async fn run(
    config: Arc<ClientConfig>,
    connection_incoming_tx: mpsc::UnboundedSender<ConnectionIncomingMessage>,
    mut connection_loop_rx: mpsc::UnboundedReceiver<ConnectionLoopCommand>,
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
                    Some(ConnectionLoopCommand::SendMessage(msg, reply)) => {
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

    let (transport, login, token) = match init_result {
        Ok(t) => t,
        Err(err) => {
            close_with_error(err, pending, connection_loop_rx, &connection_incoming_tx).await;
            return;
        }
    };

    let (mut transport_incoming, mut transport_outgoing) = transport.split();

    // Send handshake + any buffered commands
    // Helper to push a message out; close on transport error
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
        irc!["PASS", format!("oauth:{}", token)],
        irc!["NICK", login],
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

    // Main pump
    let ping_every = Duration::from_secs(30);
    let check_pong_after = Duration::from_secs(5);

    let mut send_ping_interval = interval_at(Instant::now() + ping_every, ping_every);
    let mut check_pong_interval =
        interval_at(Instant::now() + ping_every + check_pong_after, ping_every);

    let mut pong_received = false;
    let mut awaiting_pong = false;

    let close_reason: Error = loop {
        tokio::select! {
            biased;
            _ = send_ping_interval.tick() => {
                pong_received = false;
                awaiting_pong = true;

                if let Err(err) = send_or_close!(irc!["PING", "tmi.twitch.tv"], None) {
                    break err;
                }
            }
            _ = check_pong_interval.tick() => {
                if awaiting_pong && !pong_received {
                    break Error::PingTimeout;
                }
            }
            cmd = connection_loop_rx.recv() => {
                match cmd {
                    Some(ConnectionLoopCommand::SendMessage(msg, reply)) => {
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
                        match ServerMessage::try_from(irc_message) {
                            Ok(server_message) => {
                                let should_close =
                                    matches!(&server_message, ServerMessage::Reconnect(_));

                                match &server_message {
                                    ServerMessage::Ping(_) => {
                                        if let Err(err) = send_or_close!(
                                            irc!["PONG", "tmi.twitch.tv"],
                                            None
                                        ) {
                                            // Forward the ping to consumers before exiting
                                            connection_incoming_tx
                                                .send(ConnectionIncomingMessage::IncomingMessage(
                                                    Box::new(server_message),
                                                ))
                                                .ok();

                                            break err;
                                        }
                                    }
                                    ServerMessage::Pong(_) => {
                                        pong_received = true;
                                    }
                                    _ => {}
                                }

                                connection_incoming_tx
                                    .send(ConnectionIncomingMessage::IncomingMessage(Box::new(
                                        server_message,
                                    )))
                                    .ok();

                                if should_close {
                                    break Error::ReconnectCmd;
                                }
                            }
                            Err(parse_error) => {
                                connection_incoming_tx
                                    .send(ConnectionIncomingMessage::IncomingMessage(Box::new(
                                        ServerMessage::new_generic(IrcMessage::from(parse_error)),
                                    )))
                                    .ok();
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
