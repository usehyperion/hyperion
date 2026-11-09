use std::sync::Arc;

use futures::future::BoxFuture;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, async_runtime};
use tokio::sync::{Mutex, mpsc};
use tokio::task::AbortHandle;

use crate::error::Error;
use crate::{AppState, auth};

/// A realtime client whose events are forwarded to the frontend over an IPC
/// channel.
pub trait Client: Send + Sync + Sized + 'static {
    type Message: Serialize + Send + 'static;

    const NAME: &'static str;

    fn slot(state: &mut AppState) -> &mut Option<Connection<Self>>;

    /// Whether the client can still be used. Only asked of clients without a
    /// run task.
    fn active(&self) -> bool {
        true
    }

    /// Whether the frontend handles `message` to avoid needless IPC traffic.
    fn forwards(_message: &Self::Message) -> bool {
        true
    }
}

/// A client together with the channel its events are forwarded to and the task
/// driving it.
pub struct Connection<C: Client> {
    client: Arc<C>,
    // Retained so HMR can swap in its new channel without tearing down the live
    // websocket connection. Only useful for development.
    sink: Arc<Mutex<Channel<C::Message>>>,
    task: Option<AbortHandle>,
}

impl<C: Client> Connection<C> {
    pub fn client(&self) -> Arc<C> {
        Arc::clone(&self.client)
    }

    fn active(&self) -> bool {
        match &self.task {
            Some(task) => !task.is_finished(),
            None => self.client.active(),
        }
    }
}

/// A fresh client ready to be stored and run.
pub struct Started<C: Client> {
    pub client: Arc<C>,
    pub events: mpsc::UnboundedReceiver<C::Message>,
    /// Drives the connection until it is closed.
    pub run: Option<BoxFuture<'static, ()>>,
}

/// Connects a client and forwards its events to `channel`, unless an active
/// client already exists, in which case only the channel is swapped.
pub async fn connect<C: Client>(
    app: AppHandle,
    channel: Channel<C::Message>,
    start: impl FnOnce(&AppState) -> Result<Started<C>, Error>,
) -> Result<(), Error> {
    let state = app.state::<Mutex<AppState>>();

    auth::validate_pending(&state).await;

    let mut guard = state.lock().await;

    if let Some(connection) = C::slot(&mut guard)
        && connection.active()
    {
        *connection.sink.lock().await = channel;
        return Ok(());
    }

    let Started {
        client,
        mut events,
        run,
    } = start(&guard)?;

    let slot = C::slot(&mut guard);
    close(slot);

    let sink = Arc::new(Mutex::new(channel));

    *slot = Some(Connection {
        client,
        sink: Arc::clone(&sink),
        task: run.map(|run| async_runtime::spawn(run).inner().abort_handle()),
    });

    drop(guard);

    async_runtime::spawn(async move {
        while let Some(message) = events.recv().await {
            if C::forwards(&message) && sink.lock().await.send(message).is_err() {
                tracing::warn!("{} channel send failed", C::NAME);
            }
        }
    });

    Ok(())
}

/// Stops the client in `slot`, including any reconnect in progress. A client
/// without a run task stops once the last handle to it is dropped.
pub fn close<C: Client>(slot: &mut Option<Connection<C>>) {
    if let Some(Connection {
        task: Some(task), ..
    }) = slot.take()
    {
        task.abort();
    }
}
