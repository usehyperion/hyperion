use std::collections::HashSet;

use tokio::sync::mpsc;

use crate::irc::connection::PendingMessage;

const MAX_CHANNELS_PER_CONNECTION: usize = 90;

pub(crate) struct PoolConnection {
    pub id: usize,
    pub tx: mpsc::UnboundedSender<PendingMessage>,
    pub wanted_channels: HashSet<String>,
    pub server_channels: HashSet<String>,
}

impl PoolConnection {
    pub fn new(id: usize, tx: mpsc::UnboundedSender<PendingMessage>) -> PoolConnection {
        PoolConnection {
            id,
            tx,
            wanted_channels: HashSet::new(),
            server_channels: HashSet::new(),
        }
    }

    pub fn channels_limit_not_reached(&self) -> bool {
        self.wanted_channels.len() < MAX_CHANNELS_PER_CONNECTION
    }
}
