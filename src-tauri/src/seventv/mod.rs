mod client;

pub use client::SeventTvClient;
use serde_json::json;
use tauri::ipc::Channel;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

use crate::AppState;
use crate::api::ensure_login;
use crate::connection::{self, Client, Connection};
use crate::error::Error;

impl SeventTvClient {
    /// Subscribes to the events for a joined channel, keyed by its login.
    /// `user_id` and `emote_set_id` are the channel's 7TV user and active
    /// emote set, if it has them.
    pub fn join(
        &self,
        login: &str,
        channel_id: &str,
        user_id: Option<&str>,
        emote_set_id: Option<&str>,
    ) {
        let channel = json!({
            "ctx": "channel",
            "platform": "TWITCH",
            "id": channel_id
        });

        let mut events = vec![
            ("cosmetic.create".to_owned(), channel.clone()),
            ("entitlement.create".to_owned(), channel),
        ];

        if let Some(emote_set_id) = emote_set_id {
            events.push((
                "emote_set.*".to_owned(),
                json!({ "object_id": emote_set_id }),
            ));
        }

        if let Some(user_id) = user_id {
            events.push(("user.update".to_owned(), json!({ "object_id": user_id })));
        }

        self.set_channel(login, events);
    }
}

impl Client for SeventTvClient {
    type Message = serde_json::Value;

    const NAME: &'static str = "7TV";

    fn slot(state: &mut AppState) -> &mut Option<Connection<Self>> {
        &mut state.seventv
    }
}

#[tauri::command]
pub async fn connect_seventv(
    app_handle: AppHandle,
    channel: Channel<serde_json::Value>,
) -> Result<(), Error> {
    connection::connect(app_handle, channel, |_| Ok(SeventTvClient::start())).await
}

/// Recomputes the 7TV subscriptions for a joined channel, after its 7TV user
/// or active emote set changed.
#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn sync_seventv(
    state: State<'_, Mutex<AppState>>,
    login: String,
    id: String,
    stv_id: Option<String>,
    set_id: Option<String>,
) -> Result<(), Error> {
    ensure_login(&login)?;

    if let Some(seventv) = &state.lock().await.seventv {
        seventv
            .client()
            .join(&login, &id, stv_id.as_deref(), set_id.as_deref());
    }

    Ok(())
}
