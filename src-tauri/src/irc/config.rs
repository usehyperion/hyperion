use std::hash::{BuildHasher, RandomState};
use std::sync::Arc;

use tokio::sync::Mutex;

use crate::ws::Backoff;

#[derive(Debug)]
pub struct ClientConfig {
    pub login: String,
    pub token: Option<String>,
    /// Shared by the client's connections so they open one at a time. Holds
    /// the backoff for consecutive failed connects, which a connection waits
    /// out while still holding the lock.
    pub connection_rate_limiter: Arc<Mutex<Backoff>>,
}

impl ClientConfig {
    pub fn new(login: String, token: String) -> ClientConfig {
        Self::with_credentials(login, Some(token))
    }

    pub fn anonymous() -> ClientConfig {
        let suffix = RandomState::new().hash_one(()) % 100_000;
        Self::with_credentials(format!("justinfan{suffix}"), None)
    }

    fn with_credentials(login: String, token: Option<String>) -> ClientConfig {
        ClientConfig {
            login,
            token,
            connection_rate_limiter: Arc::new(Mutex::new(Backoff::default())),
        }
    }
}
