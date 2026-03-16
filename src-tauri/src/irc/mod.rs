pub mod client;
mod config;
mod connection;
mod error;
pub mod message;
pub mod websocket;

pub use client::IrcClient;
use config::ClientConfig;
use error::Error;
use message::ServerMessage;
use tauri::ipc::Channel;
use tauri::{State, async_runtime};
use tokio::sync::Mutex;

use crate::AppState;
use crate::api::get_access_token;
use crate::error::Error as AppError;
use crate::irc::message::IrcMessage;

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn connect_irc(
    state: State<'_, Mutex<AppState>>,
    channel: Channel<ServerMessage>,
) -> Result<(), AppError> {
    let mut guard = state.lock().await;
    let token = get_access_token(&guard)?;
    let login = token.login.to_string();

    let config = ClientConfig::new(
        login.clone(),
        // Need to convert to &str first because AccessToken::to_string masks
        // the actual token
        token.access_token.as_str().to_string(),
    );

    let (mut incoming, client) = IrcClient::new(config);

    async_runtime::spawn(async move {
        while let Some(message) = incoming.recv().await {
            let IrcMessage { tags, command, .. } = message.raw();

            tracing::trace!(?tags, "Received {command} message");

            if channel.send(message).is_err() {
                tracing::warn!("IRC frontend channel closed");
                break;
            }
        }
    });

    client.connect().await;
    guard.irc = Some(client);

    Ok(())
}
