pub mod client;

use std::sync::Arc;

pub use client::SeventTvClient;
use serde_json::json;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, State, async_runtime};
use tokio::sync::Mutex;

use crate::AppState;
use crate::error::Error;

#[tauri::command]
pub async fn connect_seventv(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    channel: Channel<serde_json::Value>,
) -> Result<(), Error> {
    let mut state = state.lock().await;

    if let Some(client) = &state.seventv
        && client.connected()
    {
        return Ok(());
    }

    let (mut incoming, client) = SeventTvClient::new();
    let client = Arc::new(client);

    state.seventv = Some(Arc::clone(&client));
    drop(state);

    async_runtime::spawn(async move {
        if let Err(err) = client.connect().await {
            tracing::error!(%err, "7TV connection failed");

            let state = app_handle.state::<Mutex<AppState>>();
            let mut state = state.lock().await;

            state.seventv = None;
        }
    });

    async_runtime::spawn(async move {
        while let Some(message) = incoming.recv().await {
            if channel.send(message).is_err() {
                tracing::warn!("7TV frontend channel closed");
                break;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn resub_emote_set(
    state: State<'_, Mutex<AppState>>,
    channel: String,
    set_id: String,
) -> Result<(), Error> {
    let state = state.lock().await;

    let Some(ref seventv) = state.seventv else {
        return Ok(());
    };

    seventv.unsubscribe(&channel, "emote_set.*").await;
    seventv
        .subscribe(&channel, "emote_set.*", &json!({ "object_id": set_id }))
        .await;

    Ok(())
}
