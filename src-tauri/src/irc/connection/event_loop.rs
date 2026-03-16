use std::collections::VecDeque;
use std::sync::{Arc, Weak};

use either::Either;
use enum_dispatch::enum_dispatch;
use futures::{SinkExt, StreamExt};
use tokio::sync::{mpsc, oneshot};
use tokio::time::{Duration, Instant, interval_at};
use tokio_tungstenite::tungstenite::Error as WsError;

use super::ConnectionIncomingMessage;
use crate::irc;
use crate::irc::message::{IrcMessage, ServerMessage};
use crate::irc::websocket::{Incoming, Outgoing, WsTransport};
use crate::irc::{ClientConfig, Error};

#[derive(Debug)]
pub(crate) enum ConnectionLoopCommand {
    SendMessage(IrcMessage, Option<oneshot::Sender<Result<(), Error>>>),
    TransportInitFinished(Result<(WsTransport, String, String), Error>),
    SendError(Arc<WsError>),
    IncomingMessage(Option<Result<IrcMessage, Error>>),
    SendPing(),
    CheckPong(),
}

#[enum_dispatch]
trait ConnectionLoopStateMethods {
    fn send_message(
        &mut self,
        message: IrcMessage,
        reply_sender: Option<oneshot::Sender<Result<(), Error>>>,
    );
    fn on_transport_init_finished(
        self,
        init_result: Result<(WsTransport, String, String), Error>,
    ) -> ConnectionLoopState;
    fn on_send_error(self, error: Arc<WsError>) -> ConnectionLoopState;
    fn on_incoming_message(
        self,
        maybe_message: Option<Result<IrcMessage, Error>>,
    ) -> ConnectionLoopState;
    fn send_ping(&mut self);
    fn check_pong(self) -> ConnectionLoopState;
}

#[enum_dispatch(ConnectionLoopStateMethods)]
enum ConnectionLoopState {
    Initializing(ConnectionLoopInitializingState),
    Open(ConnectionLoopOpenState),
    Closed(ConnectionLoopClosedState),
}

pub(crate) struct ConnectionLoopWorker {
    connection_loop_rx: mpsc::UnboundedReceiver<ConnectionLoopCommand>,
    state: ConnectionLoopState,
}

impl ConnectionLoopWorker {
    pub fn spawn(
        config: Arc<ClientConfig>,
        connection_incoming_tx: mpsc::UnboundedSender<ConnectionIncomingMessage>,
        connection_loop_tx: Weak<mpsc::UnboundedSender<ConnectionLoopCommand>>,
        connection_loop_rx: mpsc::UnboundedReceiver<ConnectionLoopCommand>,
    ) {
        let worker = ConnectionLoopWorker {
            connection_loop_rx,
            state: ConnectionLoopState::Initializing(ConnectionLoopInitializingState {
                commands_queue: VecDeque::new(),
                connection_loop_tx: Weak::clone(&connection_loop_tx),
                connection_incoming_tx,
            }),
        };

        tokio::spawn(ConnectionLoopWorker::run_init_task(
            config,
            connection_loop_tx,
        ));

        tokio::spawn(worker.run());
    }

    async fn run_init_task(
        config: Arc<ClientConfig>,
        connection_loop_tx: Weak<mpsc::UnboundedSender<ConnectionLoopCommand>>,
    ) {
        let res = try {
            let login = config.login.clone();
            let token = config.token.clone();

            let rate_limit_permit = Arc::clone(&config.connection_rate_limiter)
                .acquire_owned()
                .await;

            let connect_attempt = WsTransport::new();
            let timeout = tokio::time::sleep(config.connect_timeout);

            let transport = tokio::select! {
                t_result = connect_attempt => {
                    t_result.map_err(Arc::new)
                        .map_err(Error::Connect)
                },
                _ = timeout => {
                    Err(Error::ConnectTimeout)
                }
            }?;

            tokio::spawn(async move {
                tokio::time::sleep(config.new_connection_every).await;
                drop(rate_limit_permit);
            });

            (transport, login, token)
        };

        if let Some(connection_loop_tx) = connection_loop_tx.upgrade() {
            connection_loop_tx
                .send(ConnectionLoopCommand::TransportInitFinished(res))
                .ok();
        }
    }

    async fn run(mut self) {
        while let Some(command) = self.connection_loop_rx.recv().await {
            self = self.process_command(command);
        }
    }

    fn process_command(mut self, command: ConnectionLoopCommand) -> Self {
        match command {
            ConnectionLoopCommand::SendMessage(message, reply_sender) => {
                self.state.send_message(message, reply_sender);
            }
            ConnectionLoopCommand::TransportInitFinished(init_result) => {
                self.state = self.state.on_transport_init_finished(init_result);
            }
            ConnectionLoopCommand::SendError(error) => {
                self.state = self.state.on_send_error(error);
            }
            ConnectionLoopCommand::IncomingMessage(maybe_msg) => {
                self.state = self.state.on_incoming_message(maybe_msg);
            }
            ConnectionLoopCommand::SendPing() => self.state.send_ping(),
            ConnectionLoopCommand::CheckPong() => {
                self.state = self.state.check_pong();
            }
        };
        self
    }
}

type CommandQueue = VecDeque<(IrcMessage, Option<oneshot::Sender<Result<(), Error>>>)>;
type MessageReceiver =
    mpsc::UnboundedReceiver<(IrcMessage, Option<oneshot::Sender<Result<(), Error>>>)>;
type MessageSender =
    mpsc::UnboundedSender<(IrcMessage, Option<oneshot::Sender<Result<(), Error>>>)>;

struct ConnectionLoopInitializingState {
    commands_queue: CommandQueue,
    connection_loop_tx: Weak<mpsc::UnboundedSender<ConnectionLoopCommand>>,
    connection_incoming_tx: mpsc::UnboundedSender<ConnectionIncomingMessage>,
}

impl ConnectionLoopInitializingState {
    fn transition_to_closed(self, err: Error) -> ConnectionLoopState {
        for (_message, return_sender) in self.commands_queue.into_iter() {
            if let Some(return_sender) = return_sender {
                return_sender.send(Err(err.clone())).ok();
            }
        }

        self.connection_incoming_tx
            .send(ConnectionIncomingMessage::StateClosed)
            .ok();

        ConnectionLoopState::Closed(ConnectionLoopClosedState {
            reason_for_closure: err,
        })
    }

    async fn run_incoming_forward_task(
        mut transport_incoming: Incoming,
        connection_loop_tx: Weak<mpsc::UnboundedSender<ConnectionLoopCommand>>,
        mut shutdown_notify: oneshot::Receiver<()>,
    ) {
        loop {
            tokio::select! {
                _ = &mut shutdown_notify => {
                    break;
                }
                incoming_message = transport_incoming.next() => {
                    let do_exit = matches!(incoming_message, None | Some(Err(_)));

                    let incoming_message = incoming_message.map(|x| x.map_err(|e| match e {
                        Either::Left(e) => Error::Incoming(Arc::new(e)),
                        Either::Right(e) => Error::IrcParse(e)
                    }));

                    if let Some(connection_loop_tx) = connection_loop_tx.upgrade() {
                        connection_loop_tx.send(ConnectionLoopCommand::IncomingMessage(incoming_message)).ok();
                    } else {
                        break;
                    }

                    if do_exit {
                        break;
                    }
                }
            }
        }
    }

    async fn run_outgoing_forward_task(
        mut transport_outgoing: Outgoing,
        mut messages_rx: MessageReceiver,
        connection_loop_tx: Weak<mpsc::UnboundedSender<ConnectionLoopCommand>>,
    ) {
        while let Some((message, reply_sender)) = messages_rx.recv().await {
            let res = transport_outgoing.send(message).await.map_err(Arc::new);

            if let Err(ref err) = res
                && let Some(connection_loop_tx) = connection_loop_tx.upgrade()
            {
                connection_loop_tx
                    .send(ConnectionLoopCommand::SendError(Arc::clone(err)))
                    .ok();
            }

            if let Some(reply_sender) = reply_sender {
                reply_sender.send(res.map_err(Error::Outgoing)).ok();
            }
        }
    }

    async fn run_ping_task(
        connection_loop_tx: Weak<mpsc::UnboundedSender<ConnectionLoopCommand>>,
        mut shutdown_notify: oneshot::Receiver<()>,
    ) {
        let ping_every = Duration::from_secs(30);
        let check_pong_after = Duration::from_secs(5);

        let mut send_ping_interval = interval_at(Instant::now() + ping_every, ping_every);
        let mut check_pong_interval =
            interval_at(Instant::now() + ping_every + check_pong_after, ping_every);

        loop {
            tokio::select! {
                _ = &mut shutdown_notify => {
                    break;
                },
                _ = send_ping_interval.tick() => {
                    if let Some(connection_loop_tx) = connection_loop_tx.upgrade() {
                        connection_loop_tx.send(ConnectionLoopCommand::SendPing()).ok();
                    } else {
                        break;
                    }
                }
                _ = check_pong_interval.tick() => {
                    if let Some(connection_loop_tx) = connection_loop_tx.upgrade() {
                        connection_loop_tx.send(ConnectionLoopCommand::CheckPong()).ok();
                    } else {
                        break;
                    }
                }
            }
        }
    }
}

impl ConnectionLoopStateMethods for ConnectionLoopInitializingState {
    fn send_message(
        &mut self,
        message: IrcMessage,
        reply_sender: Option<oneshot::Sender<Result<(), Error>>>,
    ) {
        self.commands_queue.push_back((message, reply_sender));
    }

    fn on_transport_init_finished(
        self,
        init_result: Result<(WsTransport, String, String), Error>,
    ) -> ConnectionLoopState {
        match init_result {
            Ok((transport, login, token)) => {
                let (transport_incoming, transport_outgoing) = transport.split();

                let (kill_incoming_loop_tx, kill_incoming_loop_rx) = oneshot::channel();
                tokio::spawn(ConnectionLoopInitializingState::run_incoming_forward_task(
                    transport_incoming,
                    Weak::clone(&self.connection_loop_tx),
                    kill_incoming_loop_rx,
                ));

                let (outgoing_messages_tx, outgoing_messages_rx) = mpsc::unbounded_channel();
                tokio::spawn(ConnectionLoopInitializingState::run_outgoing_forward_task(
                    transport_outgoing,
                    outgoing_messages_rx,
                    Weak::clone(&self.connection_loop_tx),
                ));

                let (kill_pinger_tx, kill_pinger_rx) = oneshot::channel();
                tokio::spawn(ConnectionLoopInitializingState::run_ping_task(
                    Weak::clone(&self.connection_loop_tx),
                    kill_pinger_rx,
                ));

                let mut new_state = ConnectionLoopState::Open(ConnectionLoopOpenState {
                    connection_incoming_tx: self.connection_incoming_tx,
                    outgoing_messages_tx,
                    pong_received: false,
                    kill_incoming_loop_tx: Some(kill_incoming_loop_tx),
                    kill_pinger_tx: Some(kill_pinger_tx),
                });

                new_state.send_message(
                    irc!["CAP", "REQ", "twitch.tv/tags twitch.tv/commands"],
                    None,
                );

                new_state.send_message(irc!["PASS", format!("oauth:{}", token)], None);
                new_state.send_message(irc!["NICK", login], None);

                for (message, return_sender) in self.commands_queue.into_iter() {
                    new_state.send_message(message, return_sender);
                }

                new_state
            }
            Err(init_error) => self.transition_to_closed(init_error),
        }
    }

    fn on_send_error(self, error: Arc<WsError>) -> ConnectionLoopState {
        self.transition_to_closed(Error::Outgoing(error))
    }

    fn on_incoming_message(
        self,
        _maybe_message: Option<Result<IrcMessage, Error>>,
    ) -> ConnectionLoopState {
        unreachable!("messages cannot come in while initializing")
    }

    fn send_ping(&mut self) {
        unreachable!("pinger should not run while initializing")
    }

    fn check_pong(self) -> ConnectionLoopState {
        unreachable!("pinger should not run while initializing")
    }
}

struct ConnectionLoopOpenState {
    connection_incoming_tx: mpsc::UnboundedSender<ConnectionIncomingMessage>,
    outgoing_messages_tx: MessageSender,
    pong_received: bool,
    kill_incoming_loop_tx: Option<oneshot::Sender<()>>,
    kill_pinger_tx: Option<oneshot::Sender<()>>,
}

impl ConnectionLoopOpenState {
    fn transition_to_closed(self, cause: Error) -> ConnectionLoopState {
        self.connection_incoming_tx
            .send(ConnectionIncomingMessage::StateClosed)
            .ok();

        ConnectionLoopState::Closed(ConnectionLoopClosedState {
            reason_for_closure: cause,
        })
    }
}

impl Drop for ConnectionLoopOpenState {
    fn drop(&mut self) {
        self.kill_incoming_loop_tx.take().unwrap().send(()).ok();
        self.kill_pinger_tx.take().unwrap().send(()).ok();
    }
}

impl ConnectionLoopStateMethods for ConnectionLoopOpenState {
    fn send_message(
        &mut self,
        message: IrcMessage,
        reply_sender: Option<oneshot::Sender<Result<(), Error>>>,
    ) {
        self.outgoing_messages_tx.send((message, reply_sender)).ok();
    }

    fn on_transport_init_finished(
        self,
        _: Result<(WsTransport, String, String), Error>,
    ) -> ConnectionLoopState {
        unreachable!("transport init cannot finish more than once")
    }

    fn on_send_error(self, error: Arc<WsError>) -> ConnectionLoopState {
        self.transition_to_closed(Error::Outgoing(error))
    }

    fn on_incoming_message(
        mut self,
        maybe_message: Option<Result<IrcMessage, Error>>,
    ) -> ConnectionLoopState {
        match maybe_message {
            None => self.transition_to_closed(Error::RemoteUnexpectedlyClosedConnection),
            Some(Err(error)) => self.transition_to_closed(error),
            Some(Ok(irc_message)) => {
                let server_message = ServerMessage::try_from(irc_message);

                match server_message {
                    Ok(server_message) => {
                        let should_close =
                            matches!(&server_message, ServerMessage::Reconnect(_));

                        match &server_message {
                            ServerMessage::Ping(_) => {
                                self.send_message(irc!["PONG", "tmi.twitch.tv"], None);
                            }
                            ServerMessage::Pong(_) => {
                                self.pong_received = true;
                            }
                            _ => {}
                        }

                        self.connection_incoming_tx
                            .send(ConnectionIncomingMessage::IncomingMessage(Box::new(
                                server_message,
                            )))
                            .ok();

                        if should_close {
                            return self.transition_to_closed(Error::ReconnectCmd);
                        }
                    }
                    Err(parse_error) => {
                        self.connection_incoming_tx
                            .send(ConnectionIncomingMessage::IncomingMessage(Box::new(
                                ServerMessage::new_generic(IrcMessage::from(parse_error)),
                            )))
                            .ok();
                    }
                }

                ConnectionLoopState::Open(self)
            }
        }
    }

    fn send_ping(&mut self) {
        self.pong_received = false;
        self.send_message(irc!["PING", "tmi.twitch.tv"], None);
    }

    fn check_pong(self) -> ConnectionLoopState {
        if !self.pong_received {
            self.transition_to_closed(Error::PingTimeout)
        } else {
            ConnectionLoopState::Open(self)
        }
    }
}

struct ConnectionLoopClosedState {
    reason_for_closure: Error,
}

impl ConnectionLoopStateMethods for ConnectionLoopClosedState {
    fn send_message(
        &mut self,
        _: IrcMessage,
        reply_sender: Option<oneshot::Sender<Result<(), Error>>>,
    ) {
        if let Some(reply_sender) = reply_sender {
            reply_sender.send(Err(self.reason_for_closure.clone())).ok();
        }
    }

    fn on_transport_init_finished(
        self,
        _: Result<(WsTransport, String, String), Error>,
    ) -> ConnectionLoopState {
        ConnectionLoopState::Closed(self)
    }

    fn on_send_error(self, _error: Arc<WsError>) -> ConnectionLoopState {
        ConnectionLoopState::Closed(self)
    }

    fn on_incoming_message(self, _: Option<Result<IrcMessage, Error>>) -> ConnectionLoopState {
        ConnectionLoopState::Closed(self)
    }

    fn send_ping(&mut self) {}

    fn check_pong(self) -> ConnectionLoopState {
        ConnectionLoopState::Closed(self)
    }
}
