//! What the websocket subscription clients (PubSub and 7TV) share: a runner
//! that keeps a connection alive and reconnects it, and the store of
//! subscriptions each connection is synced from.

use std::collections::HashMap;
use std::future::{self, Future};
use std::sync::{Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use futures::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::Notify;
use tokio::time::{self, Instant, Interval, MissedTickBehavior};
use tokio_tungstenite::tungstenite::{self, Message};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async};

/// Boxed, since the unboxed error is large enough to bloat every result.
pub type WsError = Box<tungstenite::Error>;

const INITIAL_BACKOFF: Duration = Duration::from_secs(1);
const MAX_BACKOFF: Duration = Duration::from_secs(120);

/// Exponential backoff between reconnect attempts, doubling after each failed
/// attempt up to a cap.
#[derive(Debug)]
pub struct Backoff {
    next: Duration,
}

impl Default for Backoff {
    fn default() -> Self {
        Self {
            next: INITIAL_BACKOFF,
        }
    }
}

impl Backoff {
    /// Returns how long to wait before the next attempt, and doubles the wait
    /// after it.
    pub fn next_delay(&mut self) -> Duration {
        let delay = self.next;
        self.next = (self.next * 2).min(MAX_BACKOFF);
        delay
    }

    /// Starts over from the shortest wait, after an attempt succeeded.
    pub fn reset(&mut self) {
        self.next = INITIAL_BACKOFF;
    }
}

/// Completes once `deadline` passes, or never if there is none.
pub async fn deadline_elapsed(deadline: Option<Instant>) {
    match deadline {
        Some(deadline) => time::sleep_until(deadline).await,
        None => future::pending().await,
    }
}

/// What the runner should do after a protocol has handled an event.
pub enum Flow {
    Continue,
    /// The session can take subscriptions. `restored` means the server kept
    /// the previous session's, so only what changed since has to be sent.
    Ready {
        restored: bool,
    },
    Reconnect,
}

/// Pinging the server on an interval, for protocols that leave keeping the
/// connection alive to the client.
#[derive(Clone, Copy)]
pub struct Keepalive {
    pub every: Duration,
    /// How long the server has to answer before the connection counts as dead.
    /// The protocol calls [`Link::clear_deadline`] when the answer arrives.
    pub timeout: Duration,
    pub ping: &'static str,
}

/// A live connection, as seen by a [`Protocol`].
pub struct Link {
    socket: WebSocketStream<MaybeTlsStream<TcpStream>>,
    deadline: Option<Instant>,
}

impl Link {
    pub async fn send(&mut self, payload: &serde_json::Value) -> Result<(), WsError> {
        self.send_text(payload.to_string()).await
    }

    async fn send_text(&mut self, text: String) -> Result<(), WsError> {
        Ok(self.socket.send(Message::text(text)).await?)
    }

    /// Drops the connection unless the deadline is moved or cleared within
    /// `timeout`.
    pub fn expect_within(&mut self, timeout: Duration) {
        self.deadline = Some(Instant::now() + timeout);
    }

    pub fn clear_deadline(&mut self) {
        self.deadline = None;
    }
}

/// A websocket protocol that [`run`] keeps connected.
pub trait Protocol: Send + 'static {
    /// What the server needs, besides its key, to subscribe to an event.
    type Subscription: Clone + PartialEq + Send + 'static;

    /// Names the connection in logs.
    const NAME: &'static str;
    const URI: &'static str;
    const KEEPALIVE: Option<Keepalive> = None;

    fn subscriptions(&self) -> &SubscriptionStore<Self::Subscription>;

    /// Called once the socket is open, before any message arrives.
    fn opened(&mut self, link: &mut Link) -> Flow;

    /// Handles a text frame from the server.
    fn received(
        &mut self,
        text: &str,
        link: &mut Link,
    ) -> impl Future<Output = Result<Flow, WsError>> + Send;

    /// Sends the server the subscriptions that changed since it was last
    /// synced. Removals come first, so a changed subscription is replaced
    /// rather than duplicated.
    fn sync(
        &mut self,
        changes: &Changes<Self::Subscription>,
        link: &mut Link,
    ) -> impl Future<Output = Result<(), WsError>> + Send;
}

/// Keeps `protocol` connected until the task running it is aborted, retrying
/// with exponential backoff whenever connecting fails or the connection drops.
#[tracing::instrument(name = "ws", skip_all, fields(client = P::NAME))]
pub async fn run<P: Protocol>(mut protocol: P) {
    let mut backoff = Backoff::default();

    loop {
        tracing::info!("Connecting");

        match connect_async(P::URI).await {
            Ok((socket, _)) => {
                tracing::info!("Connected");

                let link = Link {
                    socket,
                    deadline: None,
                };

                if drive(&mut protocol, link).await {
                    backoff.reset();
                }
            }
            Err(err) => tracing::error!(%err, "Failed to connect"),
        }

        let delay = backoff.next_delay();
        tracing::info!(?delay, "Reconnecting");
        time::sleep(delay).await;
    }
}

/// Waits for the next ping to be due, or forever for protocols that don't
/// ping.
async fn next_ping(pings: &mut Option<(Interval, Keepalive)>) -> Keepalive {
    match pings {
        Some((interval, keepalive)) => {
            interval.tick().await;
            *keepalive
        }
        None => future::pending().await,
    }
}

/// Runs one connection until it drops, returning whether it became ready.
async fn drive<P: Protocol>(protocol: &mut P, mut link: Link) -> bool {
    let mut ready = false;

    // The first tick is immediate, so the connection is checked right away
    let mut pings = P::KEEPALIVE.map(|keepalive| {
        let mut interval = time::interval(keepalive.every);
        interval.set_missed_tick_behavior(MissedTickBehavior::Delay);
        (interval, keepalive)
    });

    let mut next = Ok(protocol.opened(&mut link));

    loop {
        match next {
            Ok(Flow::Continue) => {}
            Ok(Flow::Ready { restored }) => {
                if !restored {
                    protocol.subscriptions().forget_synced();
                }

                ready = true;
                next = sync(protocol, &mut link).await.map(|()| Flow::Continue);
                continue;
            }
            Ok(Flow::Reconnect) => return ready,
            Err(err) => {
                tracing::error!(%err, "Connection failed");
                return ready;
            }
        }

        next = tokio::select! {
            () = deadline_elapsed(link.deadline) => {
                tracing::warn!("Server stopped responding");
                return ready;
            }
            keepalive = next_ping(&mut pings) => {
                link.expect_within(keepalive.timeout);
                link.send_text(keepalive.ping.to_owned()).await.map(|()| Flow::Continue)
            }
            // Changes made while not ready are picked up by the sync on ready
            () = protocol.subscriptions().changed(), if ready => {
                sync(protocol, &mut link).await.map(|()| Flow::Continue)
            }
            frame = link.socket.next() => match frame {
                Some(Ok(Message::Text(text))) => protocol.received(&text, &mut link).await,
                Some(Ok(Message::Close(frame))) => {
                    tracing::warn!(?frame, "Server closed the connection");
                    Ok(Flow::Reconnect)
                }
                // tungstenite answers pings by itself
                Some(Ok(_)) => Ok(Flow::Continue),
                Some(Err(err)) => Err(err.into()),
                None => {
                    tracing::warn!("Connection ended unexpectedly");
                    Ok(Flow::Reconnect)
                }
            },
        };
    }
}

async fn sync<P: Protocol>(protocol: &mut P, link: &mut Link) -> Result<(), WsError> {
    let changes = protocol.subscriptions().pending();

    if changes.is_empty() {
        return Ok(());
    }

    tracing::debug!(
        added = changes.added.len(),
        removed = changes.removed.len(),
        "Syncing subscriptions"
    );

    protocol.sync(&changes, link).await?;
    protocol.subscriptions().confirm(changes);

    Ok(())
}

/// What a subscription is kept for.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Owner {
    /// The whole session, regardless of joined channels.
    Session,
    /// A joined channel, by login.
    Channel(String),
}

impl Owner {
    fn is_channel(&self, login: &str) -> bool {
        matches!(self, Owner::Channel(owner) if owner == login)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SubKey {
    pub owner: Owner,
    pub event: String,
}

/// Subscriptions that differ between what is wanted and what the server has.
pub struct Changes<V> {
    pub removed: Vec<(SubKey, V)>,
    pub added: Vec<(SubKey, V)>,
}

impl<V> Changes<V> {
    fn is_empty(&self) -> bool {
        self.removed.is_empty() && self.added.is_empty()
    }
}

struct Subscriptions<V> {
    /// What callers want subscribed. The only state they change.
    wanted: HashMap<SubKey, V>,
    /// What the server has been told. Outlives a connection, since a resumed
    /// session keeps its subscriptions.
    synced: HashMap<SubKey, V>,
}

/// The subscriptions a client wants, which its connection keeps the server in
/// line with. Changing it never sends anything directly: while connected the
/// runner is woken to sync the difference, and otherwise the next connection
/// syncs everything once it is ready.
pub struct SubscriptionStore<V> {
    inner: Mutex<Subscriptions<V>>,
    changed: Notify,
}

impl<V> Default for SubscriptionStore<V> {
    fn default() -> Self {
        Self {
            inner: Mutex::new(Subscriptions {
                wanted: HashMap::new(),
                synced: HashMap::new(),
            }),
            changed: Notify::new(),
        }
    }
}

impl<V: Clone + PartialEq> SubscriptionStore<V> {
    fn lock(&self) -> MutexGuard<'_, Subscriptions<V>> {
        self.inner.lock().unwrap_or_else(PoisonError::into_inner)
    }

    fn update(&self, change: impl FnOnce(&mut HashMap<SubKey, V>)) {
        change(&mut self.lock().wanted);
        self.changed.notify_one();
    }

    /// Replaces every subscription kept for `owner` with `events`.
    fn set(&self, owner: &Owner, events: impl IntoIterator<Item = (String, V)>) {
        self.update(|wanted| {
            wanted.retain(|key, _| key.owner != *owner);
            wanted.extend(events.into_iter().map(|(event, value)| {
                let key = SubKey {
                    owner: owner.clone(),
                    event,
                };

                (key, value)
            }));
        });
    }

    /// Replaces every subscription for the whole session with `events`.
    pub fn set_session(&self, events: impl IntoIterator<Item = (String, V)>) {
        self.set(&Owner::Session, events);
    }

    /// Replaces every subscription for `channel`, a login, with `events`.
    pub fn set_channel(&self, channel: &str, events: impl IntoIterator<Item = (String, V)>) {
        self.set(&Owner::Channel(channel.to_owned()), events);
    }

    pub fn remove_channel(&self, channel: &str) {
        self.update(|wanted| wanted.retain(|key, _| !key.owner.is_channel(channel)));
    }

    /// Drops subscriptions the server has already ended by itself, so they
    /// are neither unsubscribed from nor resubscribed to.
    pub fn revoke(&self, mut revoked: impl FnMut(&SubKey) -> bool) {
        let mut inner = self.lock();

        inner.wanted.retain(|key, _| !revoked(key));
        inner.synced.retain(|key, _| !revoked(key));
    }

    async fn changed(&self) {
        self.changed.notified().await;
    }

    /// Forgets what the server was told, for a fresh session that has nothing
    /// subscribed yet.
    fn forget_synced(&self) {
        self.lock().synced.clear();
    }

    fn pending(&self) -> Changes<V> {
        let inner = self.lock();

        let removed = inner
            .synced
            .iter()
            .filter(|(key, value)| inner.wanted.get(key) != Some(value))
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect();

        let added = inner
            .wanted
            .iter()
            .filter(|(key, value)| inner.synced.get(key) != Some(value))
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect();

        Changes { removed, added }
    }

    fn confirm(&self, changes: Changes<V>) {
        let synced = &mut self.lock().synced;

        for (key, _) in changes.removed {
            synced.remove(&key);
        }

        synced.extend(changes.added);
    }
}
