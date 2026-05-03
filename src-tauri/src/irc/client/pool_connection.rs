use std::collections::{HashSet, VecDeque};
use std::sync::Arc;
use std::time::Instant;

use crate::irc::ClientConfig;
use crate::irc::connection::Connection;

pub(crate) struct PoolConnection {
    config: Arc<ClientConfig>,
    pub id: usize,
    pub connection: Arc<Connection>,
    pub wanted_channels: HashSet<String>,
    pub server_channels: HashSet<String>,
    pub message_send_times: VecDeque<Instant>,
}

impl PoolConnection {
    pub fn new(config: Arc<ClientConfig>, id: usize, connection: Connection) -> PoolConnection {
        let message_send_times_max_entries = config.max_waiting_messages_per_connection * 2;

        PoolConnection {
            config,
            id,
            connection: Arc::new(connection),
            wanted_channels: HashSet::new(),
            server_channels: HashSet::new(),
            message_send_times: VecDeque::with_capacity(message_send_times_max_entries),
        }
    }

    pub fn register_sent_message(&mut self) {
        let max_entries = self.config.max_waiting_messages_per_connection * 2;

        self.message_send_times.push_back(Instant::now());

        if self.message_send_times.len() > max_entries {
            self.message_send_times.pop_front();
        }
    }

    pub fn channels_limit_not_reached(&self) -> bool {
        let configured_limit = self.config.max_channels_per_connection;
        self.wanted_channels.len() < configured_limit
    }
}
