pub mod client;

use std::sync::Arc;

pub use client::EventSubClient;
use client::NotificationPayload;
use tauri::async_runtime::{self, Mutex};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State};

use crate::AppState;
use crate::api::get_access_token;
use crate::error::Error;

#[tauri::command]
pub async fn connect_eventsub(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    channel: Channel<NotificationPayload>,
) -> Result<(), Error> {
    let mut guard = state.lock().await;
    let token = get_access_token(&guard)?.clone();
    let helix = Arc::new(guard.helix.clone());

    if let Some(client) = &guard.eventsub
        && client.connected()
    {
        return Ok(());
    }

    let (mut incoming, client) = EventSubClient::new(helix, Arc::new(token));
    let client = Arc::new(client);

    guard.eventsub = Some(Arc::clone(&client));
    drop(guard);

    async_runtime::spawn(async move {
        if let Err(err) = client.connect().await {
            tracing::error!(%err, "EventSub connection failed");

            let state = app_handle.state::<Mutex<AppState>>();
            let mut state = state.lock().await;

            state.eventsub = None;
        }
    });

    async_runtime::spawn(async move {
        while let Some(message) = incoming.recv().await {
            if channel.send(message).is_err() {
                tracing::warn!("EventSub frontend channel closed");
                break;
            }
        }
    });

    Ok(())
}
