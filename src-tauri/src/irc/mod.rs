mod client;
mod config;
mod connection;
mod error;
mod message;
mod websocket;

use std::sync::Arc;

use anyhow::anyhow;
pub use client::IrcClient;
use config::ClientConfig;
use error::Error;
use message::{IrcMessage, ServerMessage};
use serde::Deserialize;
use tauri::ipc::Channel;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

use crate::AppState;
use crate::auth::get_access_token;
use crate::connection::{Client, Connection, Started};
use crate::error::Error as AppError;

fn forwarded(message: &ServerMessage) -> bool {
    matches!(
        message,
        ServerMessage::ClearChat(_)
            | ServerMessage::ClearMsg(_)
            | ServerMessage::Join(_)
            | ServerMessage::Notice(_)
            | ServerMessage::Part(_)
            | ServerMessage::Privmsg(_)
            | ServerMessage::RoomState(_)
            | ServerMessage::UserNotice(_)
    )
}

impl Client for IrcClient {
    type Message = ServerMessage;

    const NAME: &'static str = "IRC";

    fn slot(state: &mut AppState) -> &mut Option<Connection<Self>> {
        &mut state.irc
    }

    fn active(&self) -> bool {
        self.active()
    }

    fn forwards(message: &ServerMessage) -> bool {
        forwarded(message)
    }
}

pub fn client(state: &AppState) -> Result<Arc<IrcClient>, AppError> {
    state.irc.as_ref().map(Connection::client).ok_or_else(|| {
        tracing::error!("No IRC connection");
        AppError::Generic(anyhow!("No IRC connection"))
    })
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn connect_irc(
    app_handle: AppHandle,
    channel: Channel<ServerMessage>,
) -> Result<(), AppError> {
    crate::connection::connect(app_handle, channel, |state| {
        let token = get_access_token(state)?;

        let config = ClientConfig::new(
            token.login.to_string(),
            // Need to convert to &str first because AccessToken::to_string masks
            // the actual token
            token.access_token.as_str().to_string(),
        );

        let (events, client) = IrcClient::new(config);

        Ok(Started {
            client: Arc::new(client),
            events,
            run: None,
        })
    })
    .await
}

#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn privmsg(
    state: State<'_, Mutex<AppState>>,
    channel: String,
    message: String,
) -> Result<(), AppError> {
    let irc = client(&*state.lock().await)?;

    irc.privmsg(channel, message)
        .await
        .map_err(anyhow::Error::from)?;

    Ok(())
}

#[derive(Debug, Deserialize)]
struct RecentMessages {
    #[serde(default)]
    messages: Vec<String>,
}

#[tracing::instrument(skip(state))]
#[tauri::command]
pub async fn fetch_recent_messages(
    state: State<'_, Mutex<AppState>>,
    channel: String,
    limit: u32,
) -> Result<Vec<ServerMessage>, AppError> {
    const BASE_URL: &str = "https://recent-messages.robotty.de/api/v2/recent-messages";

    if limit == 0 {
        tracing::debug!("History limit is 0, skipping request");
        return Ok(Vec::new());
    }

    let http = state.lock().await.http.clone();

    let response: RecentMessages = http
        .get(format!("{BASE_URL}/{channel}?limit={limit}"))
        .send()
        .await?
        .json()
        .await?;

    tracing::info!("Fetched {} recent messages", response.messages.len());

    let messages = response
        .messages
        .iter()
        .filter_map(|line| {
            let irc_message = IrcMessage::parse(line)
                .inspect_err(|err| tracing::warn!(%err, "Failed to parse IRC message"))
                .ok()?;

            ServerMessage::parse(irc_message)
                .inspect_err(|err| tracing::warn!(%err, "Failed to parse IRC message"))
                .ok()
                .flatten()
        })
        .filter(forwarded)
        .collect();

    Ok(messages)
}
