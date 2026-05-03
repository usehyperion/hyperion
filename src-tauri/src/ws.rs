//! Shared building blocks for websocket subscription clients.
//!
//! Both `eventsub::client` and `seventv::client` maintain the same shape of
//! state: a session id, an `AtomicBool` for the connected flag, and a
//! `HashMap` of subscriptions keyed by `"channel:event"`. The subscription
//! semantics differ enough (Twitch EventSub subscribes over HTTP, 7TV over
//! websocket frames) that a full `Protocol` trait would require a tangle of
//! associated types and `Box<dyn>`s. Instead this module exposes small
//! building blocks the two clients compose.
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

use tokio::sync::Mutex;

/// Build the canonical `"channel:event"` key used by both clients.
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

/// HashMap of subscriptions keyed by `"channel:event"`.
///
/// `V` is whatever per-subscription state the protocol needs (e.g. an opaque
/// remote id plus condition for EventSub, just the condition for 7TV).
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

    /// Drain every subscription, returning them as `(key, value)` pairs.
    pub async fn drain(&self) -> Vec<(String, V)> {
        self.inner.lock().await.drain().collect()
    }

    /// Collect every event suffix (the part after the `channel:` prefix) for
    /// a given channel. Used by `unsubscribe_all` in both clients.
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
