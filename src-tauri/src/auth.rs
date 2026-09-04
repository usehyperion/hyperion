use anyhow::anyhow;
use keyring::Entry;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State, Url, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::Mutex;
use twitch_api::HelixClient;
use twitch_api::twitch_oauth2::{AccessToken, UserToken};

use crate::AppState;
use crate::error::Error;

const KEYRING_SERVICE: &str = "com.hyperion.chat";
const KEYRING_USER: &str = "access-token";

fn keyring_entry() -> Result<Entry, Error> {
    Ok(Entry::new(KEYRING_SERVICE, KEYRING_USER)?)
}

/// The account a validated token belongs to, handed back to the frontend so it
/// can build its `CurrentUser` without a second round trip.
#[derive(Debug, Serialize)]
pub struct AuthUser {
    id: String,
    login: String,
}

impl From<&UserToken> for AuthUser {
    fn from(token: &UserToken) -> Self {
        Self {
            id: token.user_id.to_string(),
            login: token.login.to_string(),
        }
    }
}

#[tauri::command]
pub async fn open_twitch_login(app: AppHandle) -> Result<(), String> {
    let auth_url =
        WebviewUrl::External(Url::parse("https://www.twitch.tv/login").map_err(|e| e.to_string())?);

    let auth_window = WebviewWindowBuilder::new(&app, "twitch-login", auth_url)
        .title("Twitch Login")
        .inner_size(500.0, 500.0)
        .resizable(false)
        .build()
        .map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let window_handle = auth_window.clone();

    tauri::async_runtime::spawn(async move {
        // Url without www because the auth-token cookie is set for .twitch.tv
        let twitch_domain = Url::parse("https://twitch.tv").unwrap();

        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

            if window_handle.is_closable().is_err() {
                break;
            }

            if let Ok(cookies) = window_handle.cookies_for_url(twitch_domain.clone())
                && let Some(auth_cookie) = cookies.into_iter().find(|c| c.name() == "auth-token")
            {
                let token_value = auth_cookie.value().to_string();

                let _ = app_handle.emit_to("main", "twitch-auth-success", &token_value);
                let _ = window_handle.close();

                break;
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn store_token(
    state: State<'_, Mutex<AppState>>,
    access_token: String,
) -> Result<AuthUser, Error> {
    let mut state = state.lock().await;

    let token = UserToken::from_token(&state.helix, AccessToken::new(access_token))
        .await
        .map_err(|err| {
            tracing::error!(%err, "Rejected access token");
            Error::Generic(anyhow!("Twitch rejected the access token: {err}"))
        })?;

    keyring_entry()?.set_password(token.access_token.as_str())?;

    let user = AuthUser::from(&token);
    tracing::info!(login = %token.login, "Stored access token");

    state.token = Some(token);

    Ok(user)
}

#[tauri::command]
pub async fn clear_token(state: State<'_, Mutex<AppState>>) -> Result<(), Error> {
    state.lock().await.token = None;

    match keyring_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.into()),
    }
}

#[tauri::command]
pub async fn get_token(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, Error> {
    let state = state.lock().await;

    Ok(state
        .token
        .as_ref()
        .map(|token| token.access_token.as_str().to_string()))
}

pub fn get_access_token(state: &AppState) -> Result<&UserToken, Error> {
    state.token.as_ref().ok_or_else(|| {
        tracing::error!("Attempted to retrieve access token but no token is set");
        Error::Generic(anyhow!("Access token not set"))
    })
}

pub async fn restore_token(helix: &HelixClient<'static, reqwest::Client>) -> Option<UserToken> {
    let entry = keyring_entry()
        .inspect_err(|err| tracing::error!(%err, "Failed to open keyring entry"))
        .ok()?;

    let stored = match entry.get_password() {
        Ok(stored) => stored,
        Err(keyring::Error::NoEntry) => {
            tracing::info!("No stored access token");
            return None;
        }
        Err(err) => {
            tracing::error!(%err, "Failed to read stored access token");
            return None;
        }
    };

    match UserToken::from_token(helix, AccessToken::new(stored)).await {
        Ok(token) => {
            tracing::info!(login = %token.login, "Restored stored access token");
            Some(token)
        }
        Err(err) => {
            tracing::warn!(%err, "Stored access token is no longer valid, clearing it");

            if let Err(err) = entry.delete_credential() {
                tracing::error!(%err, "Failed to delete invalid access token");
            }

            None
        }
    }
}
