use std::collections::HashMap;
use std::sync::{Arc, Mutex as SyncMutex, MutexGuard, PoisonError};

use tauri::async_runtime;
use tauri::ipc::Channel;
use tokio::sync::{Mutex, mpsc};

pub type ChannelSink<T> = Arc<Mutex<Channel<T>>>;

pub fn channel_sink<T>(channel: Channel<T>) -> ChannelSink<T> {
    Arc::new(Mutex::new(channel))
}

pub fn forward_to_channel<T: serde::Serialize + Send + 'static>(
    mut incoming: mpsc::UnboundedReceiver<T>,
    sink: ChannelSink<T>,
    label: &'static str,
) {
    async_runtime::spawn(async move {
        while let Some(message) = incoming.recv().await {
            if sink.lock().await.send(message).is_err() {
                tracing::warn!("{label} channel send failed");
            }
        }
    });
}

pub fn sub_key(channel: &str, event: &str) -> String {
    format!("{channel}:{event}")
}

/// The lifecycle of a websocket connection.
///
/// Kept as a single value so that "is connected" and "has a session" cannot
/// disagree: a session only exists in [`Connection::Ready`], and the gap
/// between opening the socket and negotiating the session is its own state
/// rather than an unrepresentable combination of the two.
#[derive(Debug)]
pub enum Connection<S> {
    Disconnected,
    /// The socket is being established, or is open but the server has not
    /// handed out a session yet.
    Connecting,
    Ready(S),
}

/// Connection-level state shared by every websocket subscription client.
///
/// `S` is whatever the server hands back to identify the session; clients that
/// have no such concept use the default of `()`.
#[derive(Debug)]
pub struct ConnectionState<S = ()> {
    inner: SyncMutex<Connection<S>>,
}

impl<S> Default for ConnectionState<S> {
    fn default() -> Self {
        Self {
            inner: SyncMutex::new(Connection::Disconnected),
        }
    }
}

impl<S> ConnectionState<S> {
    /// Starts out [`Connection::Connecting`], so a client counts as active from
    /// the moment it is constructed rather than once its connect task happens
    /// to be scheduled.
    pub fn connecting() -> Self {
        Self {
            inner: SyncMutex::new(Connection::Connecting),
        }
    }

    fn lock(&self) -> MutexGuard<'_, Connection<S>> {
        self.inner.lock().unwrap_or_else(PoisonError::into_inner)
    }

    pub fn set_connecting(&self) {
        *self.lock() = Connection::Connecting;
    }

    pub fn set_ready(&self, session: S) {
        *self.lock() = Connection::Ready(session);
    }

    /// Drops back to [`Connection::Disconnected`], handing back the session
    /// that was in use, if there was one.
    pub fn disconnect(&self) -> Option<S> {
        match std::mem::replace(&mut *self.lock(), Connection::Disconnected) {
            Connection::Ready(session) => Some(session),
            _ => None,
        }
    }

    /// Whether a connection is live *or* being established. Callers deciding
    /// whether to spawn a client want this, not [`Self::session`], so that two
    /// racing connect attempts can't both start one.
    pub fn active(&self) -> bool {
        !matches!(*self.lock(), Connection::Disconnected)
    }
}

impl<S: Clone> ConnectionState<S> {
    /// The negotiated session, available only once the connection is ready.
    pub fn session(&self) -> Option<S> {
        match &*self.lock() {
            Connection::Ready(session) => Some(session.clone()),
            _ => None,
        }
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

    pub async fn contains(&self, channel: &str, event: &str) -> bool {
        self.inner
            .lock()
            .await
            .contains_key(&sub_key(channel, event))
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
