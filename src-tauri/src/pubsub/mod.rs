pub mod client;

use std::sync::Arc;

pub use client::PubSubClient;
use client::{PubSubHandles, PubSubMessage};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State, async_runtime};
use tokio::sync::Mutex;

use crate::AppState;
use crate::api::get_access_token;
use crate::error::Error;
use crate::ws::forward_to_channel;

#[tauri::command]
pub async fn connect_pubsub(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    channel: Channel<PubSubMessage>,
) -> Result<(), Error> {
    let mut guard = state.lock().await;

    if let Some(client) = &guard.pubsub
        && client.connected()
    {
        return Ok(());
    }

    let token = get_access_token(&guard)?.clone();

    let (PubSubHandles { events, outgoing }, client) = PubSubClient::new(Arc::new(token));
    let client = Arc::new(client);

    guard.pubsub = Some(Arc::clone(&client));
    drop(guard);

    async_runtime::spawn(async move {
        if let Err(err) = client.connect(outgoing).await {
            tracing::error!(%err, "PubSub connection failed");

            let state = app_handle.state::<Mutex<AppState>>();
            let mut state = state.lock().await;

            state.pubsub = None;
        }
    });

    forward_to_channel(events, channel, "PubSub");

    Ok(())
}
