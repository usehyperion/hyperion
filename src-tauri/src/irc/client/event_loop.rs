use std::collections::VecDeque;
use std::sync::{Arc, Weak};

use tokio::sync::{mpsc, oneshot};

use super::pool_connection::PoolConnection;
use crate::irc;
use crate::irc::ClientConfig;
use crate::irc::connection::event_loop::ConnectionLoopCommand;
use crate::irc::connection::{Connection, ConnectionIncomingMessage};
use crate::irc::message::{JoinMessage, PartMessage, ServerMessage};

#[derive(Debug)]
pub(crate) enum ClientLoopCommand {
    Connect {
        return_sender: oneshot::Sender<()>,
    },
    Join {
        channel_login: String,
    },
    Part {
        channel_login: String,
    },
    IncomingMessage {
        source_connection_id: usize,
        message: Box<ConnectionIncomingMessage>,
    },
}

pub(crate) struct ClientLoopWorker {
    config: Arc<ClientConfig>,
    next_connection_id: usize,
    current_whisper_connection_id: Option<usize>,
    client_loop_rx: mpsc::UnboundedReceiver<ClientLoopCommand>,
    connections: VecDeque<PoolConnection>,
    client_loop_tx: Weak<mpsc::UnboundedSender<ClientLoopCommand>>,
    client_incoming_messages_tx: mpsc::UnboundedSender<ServerMessage>,
}

impl ClientLoopWorker {
    pub fn spawn(
        config: Arc<ClientConfig>,
        client_loop_tx: Weak<mpsc::UnboundedSender<ClientLoopCommand>>,
        client_loop_rx: mpsc::UnboundedReceiver<ClientLoopCommand>,
        client_incoming_messages_tx: mpsc::UnboundedSender<ServerMessage>,
    ) {
        let worker = ClientLoopWorker {
            config,
            next_connection_id: 0,
            current_whisper_connection_id: None,
            client_loop_rx,
            connections: VecDeque::new(),
            client_loop_tx,
            client_incoming_messages_tx,
        };

        tokio::spawn(worker.run());
    }

    async fn run(mut self) {
        while let Some(command) = self.client_loop_rx.recv().await {
            self.process_command(command);
        }
    }

    fn process_command(&mut self, command: ClientLoopCommand) {
        match command {
            ClientLoopCommand::Connect { return_sender } => {
                if self.connections.is_empty() {
                    let new_connection = self.make_new_connection();
                    self.connections.push_back(new_connection);
                }

                return_sender.send(()).ok();
            }
            ClientLoopCommand::Join { channel_login } => self.join(channel_login),
            ClientLoopCommand::Part { channel_login } => self.part(channel_login),
            ClientLoopCommand::IncomingMessage {
                source_connection_id,
                message,
            } => self.on_incoming_message(source_connection_id, *message),
        }
    }

    #[must_use]
    fn make_new_connection(&mut self) -> PoolConnection {
        let connection_id = self.next_connection_id;
        self.next_connection_id = self.next_connection_id.wrapping_add(1);

        let (connection_incoming_messages_rx, connection) =
            Connection::new(Arc::clone(&self.config));
        let (tx_kill_incoming, rx_kill_incoming) = oneshot::channel();

        let pool_conn = PoolConnection::new(
            Arc::clone(&self.config),
            connection_id,
            connection,
            tx_kill_incoming,
        );

        tokio::spawn(ClientLoopWorker::run_incoming_forward_task(
            connection_incoming_messages_rx,
            connection_id,
            self.client_loop_tx.clone(),
            rx_kill_incoming,
        ));

        pool_conn
    }

    async fn run_incoming_forward_task(
        mut connection_incoming_messages_rx: mpsc::UnboundedReceiver<ConnectionIncomingMessage>,
        connection_id: usize,
        client_loop_tx: Weak<mpsc::UnboundedSender<ClientLoopCommand>>,
        mut rx_kill_incoming: oneshot::Receiver<()>,
    ) {
        loop {
            tokio::select! {
                _ = &mut rx_kill_incoming => {
                    break;
                }
                incoming_message = connection_incoming_messages_rx.recv() => {
                    let Some(incoming_message) = incoming_message else {
                        break;
                    };

                    let Some(client_loop_tx) = client_loop_tx.upgrade() else {
                        break;
                    };

                    if client_loop_tx.send(ClientLoopCommand::IncomingMessage {
                        source_connection_id: connection_id,
                        message: Box::new(incoming_message)
                    }).is_err() {
                        break;
                    }
                }
            }
        }
    }

    fn join(&mut self, channel_login: String) {
        let channel_already_confirmed_joined = self.connections.iter().any(|c| {
            c.wanted_channels.contains(&channel_login) && c.server_channels.contains(&channel_login)
        });

        if channel_already_confirmed_joined {
            return;
        }

        let mut pool_connection = self
            .connections
            .iter()
            .position(|c| c.wanted_channels.contains(&channel_login))
            .or_else(|| {
                self.connections
                    .iter()
                    .position(|c| c.channels_limit_not_reached())
            })
            .map(|pos| self.connections.remove(pos).unwrap())
            .unwrap_or_else(|| self.make_new_connection());

        pool_connection
            .connection
            .connection_loop_tx
            .send(ConnectionLoopCommand::SendMessage(
                irc!["JOIN", format!("#{}", channel_login)],
                None,
            ))
            .unwrap();

        pool_connection.register_sent_message();
        pool_connection.wanted_channels.insert(channel_login);

        self.connections.push_back(pool_connection);
    }

    fn part(&mut self, channel_login: String) {
        if self
            .connections
            .iter()
            .all(|c| !c.wanted_channels.contains(&channel_login))
        {
            return;
        }

        let mut pool_connection = self
            .connections
            .iter()
            .position(|c| c.wanted_channels.contains(&channel_login))
            .and_then(|pos| self.connections.remove(pos))
            .unwrap();

        pool_connection
            .connection
            .connection_loop_tx
            .send(ConnectionLoopCommand::SendMessage(
                irc!["PART", format!("#{}", channel_login)],
                None,
            ))
            .unwrap();

        pool_connection.register_sent_message();
        pool_connection.wanted_channels.remove(&channel_login);

        self.connections.push_back(pool_connection);
    }

    fn on_incoming_message(
        &mut self,
        source_connection_id: usize,
        message: ConnectionIncomingMessage,
    ) {
        match message {
            ConnectionIncomingMessage::IncomingMessage(message) => {
                let is_whisper = matches!(*message, ServerMessage::Whisper(_));

                if is_whisper {
                    match self.current_whisper_connection_id {
                        Some(current_whisper_connection_id) => {
                            if current_whisper_connection_id != source_connection_id {
                                return;
                            }
                        }
                        None => self.current_whisper_connection_id = Some(source_connection_id),
                    }
                }

                match &*message {
                    ServerMessage::Join(JoinMessage { channel_login, .. }) => {
                        let conn = self
                            .connections
                            .iter_mut()
                            .find(|c| c.id == source_connection_id)
                            .unwrap();

                        conn.server_channels.insert(channel_login.clone());
                    }
                    ServerMessage::Part(PartMessage { channel_login, .. }) => {
                        let conn = self
                            .connections
                            .iter_mut()
                            .find(|c| c.id == source_connection_id)
                            .unwrap();

                        conn.server_channels.remove(channel_login);
                    }
                    _ => {}
                }

                self.client_incoming_messages_tx.send(*message).ok();
            }
            ConnectionIncomingMessage::StateClosed => {
                let mut pool_connection = self
                    .connections
                    .iter()
                    .position(|c| c.id == source_connection_id)
                    .and_then(|pos| self.connections.remove(pos))
                    .unwrap();

                for channel in pool_connection.wanted_channels.drain() {
                    self.join(channel);
                }

                if self.current_whisper_connection_id == Some(source_connection_id) {
                    self.current_whisper_connection_id = None;
                }

                if self.connections.is_empty() {
                    let new_connection = self.make_new_connection();
                    self.connections.push_back(new_connection);
                }
            }
        }
    }
}
