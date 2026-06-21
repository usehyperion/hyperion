use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::async_runtime;
use tauri::ipc::Channel;
use tokio::sync::{Mutex, mpsc};

pub struct Backoff(Duration);

impl Backoff {
    const FLOOR: Duration = Duration::from_secs(1);
    const CEILING: Duration = Duration::from_secs(30);

    pub fn new() -> Self {
        Self(Self::FLOOR)
    }

    pub fn reset(&mut self) {
        self.0 = Self::FLOOR;
    }

    pub async fn sleep(&mut self) {
        tokio::time::sleep(self.0).await;
        self.0 = (self.0 * 2).min(Self::CEILING);
    }
}

impl Default for Backoff {
    fn default() -> Self {
        Self::new()
    }
}

pub fn forward_to_channel<T: serde::Serialize + Send + 'static>(
    mut incoming: mpsc::UnboundedReceiver<T>,
    channel: Channel<T>,
    label: &'static str,
) {
    async_runtime::spawn(async move {
        while let Some(message) = incoming.recv().await {
            if channel.send(message).is_err() {
                tracing::warn!("{label} channel closed");
                break;
            }
        }
    });
}

pub fn sub_key(channel: &str, event: &str) -> String {
    format!("{channel}:{event}")
}

/// Connection-level state shared by every websocket subscription client.
#[derive(Debug, Default)]
pub struct ConnectionState {
    pub session_id: Mutex<Option<String>>,
    pub connected: AtomicBool,
}

impl ConnectionState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    pub fn set_connected(&self, value: bool) {
        self.connected.store(value, Ordering::Relaxed);
    }

    pub async fn set_session_id(&self, id: Option<String>) {
        *self.session_id.lock().await = id;
    }

    pub async fn session_id(&self) -> Option<String> {
        self.session_id.lock().await.clone()
    }
}

#[derive(Debug)]
pub struct SubscriptionStore<V> {
    inner: Mutex<HashMap<String, V>>,
}

impl<V> Default for SubscriptionStore<V> {
    fn default() -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
        }
    }
}

impl<V> SubscriptionStore<V> {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn insert(&self, channel: &str, event: &str, value: V) {
        self.inner
            .lock()
            .await
            .insert(sub_key(channel, event), value);
    }

    pub async fn remove(&self, channel: &str, event: &str) -> Option<V> {
        self.inner.lock().await.remove(&sub_key(channel, event))
    }

    pub async fn remove_by<F>(&self, mut predicate: F) -> Option<V>
    where
        F: FnMut(&V) -> bool,
    {
        let mut map = self.inner.lock().await;
        let key = map
            .iter()
            .find_map(|(k, v)| predicate(v).then(|| k.clone()))?;

        map.remove(&key)
    }

    pub async fn drain(&self) -> Vec<(String, V)> {
        self.inner.lock().await.drain().collect()
    }

    pub async fn events_for_channel(&self, channel: &str) -> Vec<String> {
        let prefix = format!("{channel}:");

        self.inner
            .lock()
            .await
            .keys()
            .filter_map(|k| k.strip_prefix(&prefix).map(String::from))
            .collect()
    }
}
