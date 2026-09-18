use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::anyhow;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, State, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tokio::sync::Mutex;
use twitch_api::HelixClient;
use twitch_api::twitch_oauth2::{AccessToken, UserToken};

use crate::AppState;
use crate::error::Error;

const KEYRING_SERVICE: &str = "com.hyperion.chat";
const KEYRING_USER: &str = "session";

const LOGIN_WINDOW_LABEL: &str = "twitch-login";
const INTEGRITY_WINDOW_LABEL: &str = "twitch-integrity";

/// How long to wait for the in-page integrity request before giving up.
const INTEGRITY_POLL_INTERVAL: tokio::time::Duration = tokio::time::Duration::from_millis(150);
const INTEGRITY_POLL_ATTEMPTS: u32 = 100;

/// Treat a token as spent slightly before it actually lapses.
const INTEGRITY_EXPIRY_SKEW_MS: i64 = 5 * 60 * 1000;

fn keyring_entry() -> Result<Entry, Error> {
    Ok(Entry::new(KEYRING_SERVICE, KEYRING_USER)?)
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as i64)
        .unwrap_or_default()
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Integrity {
    token: String,
    device_id: String,
    expiration: i64,
}

impl Integrity {
    fn is_stale(&self) -> bool {
        self.expiration.saturating_sub(INTEGRITY_EXPIRY_SKEW_MS) <= now_ms()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TwitchAuth {
    access_token: String,
    #[serde(default)]
    integrity: Option<Integrity>,
}

// WebView2 serializes JS numbers as doubles :/
fn deserialize_epoch_ms<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Option::<f64>::deserialize(deserializer)?.map(|millis| millis as i64))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IntegrityResult {
    device_id: String,
    #[serde(default)]
    token: Option<String>,
    #[serde(default, deserialize_with = "deserialize_epoch_ms")]
    expiration: Option<i64>,
    #[serde(default)]
    error: Option<String>,
}

impl IntegrityResult {
    fn into_integrity(self) -> Option<Integrity> {
        Some(Integrity {
            token: self.token?,
            device_id: self.device_id,
            expiration: self.expiration?,
        })
    }
}

fn read_credentials() -> Option<TwitchAuth> {
    let entry = keyring_entry()
        .inspect_err(|err| tracing::error!(%err, "Failed to open keyring entry"))
        .ok()?;

    let stored = match entry.get_password() {
        Ok(stored) => stored,
        Err(keyring::Error::NoEntry) => {
            tracing::info!("No stored credentials");
            return None;
        }
        Err(err) => {
            tracing::error!(%err, "Failed to read stored credentials");
            return None;
        }
    };

    match serde_json::from_str(&stored) {
        Ok(auth) => Some(auth),
        Err(_) => Some(TwitchAuth {
            access_token: stored,
            integrity: None,
        }),
    }
}

fn write_credentials(auth: &TwitchAuth) -> Result<(), Error> {
    keyring_entry()?.set_password(&serde_json::to_string(auth)?)?;
    Ok(())
}

async fn eval_value(window: &WebviewWindow, js: impl Into<String>) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let tx = std::sync::Mutex::new(Some(tx));

    window
        .eval_with_callback(js, move |value| {
            if let Ok(mut tx) = tx.lock()
                && let Some(tx) = tx.take()
            {
                let _ = tx.send(value);
            }
        })
        .inspect_err(|err| tracing::error!(%err, "Failed to evaluate script in webview"))
        .ok()?;

    rx.await.ok()
}

async fn wait_for_document(window: &WebviewWindow) -> bool {
    for _ in 0..INTEGRITY_POLL_ATTEMPTS {
        let ready = eval_value(window, "document.readyState")
            .await
            .and_then(|value| serde_json::from_str::<String>(&value).ok());

        if ready.as_deref() == Some("complete") {
            return true;
        }

        tokio::time::sleep(INTEGRITY_POLL_INTERVAL).await;
    }

    tracing::warn!("Timed out waiting for a webview to finish loading");

    false
}

async fn fetch_integrity(window: &WebviewWindow, access_token: &str) -> Option<IntegrityResult> {
    if !wait_for_document(window).await {
        return None;
    }

    eval_value(
        window,
        format!(
            r#"(() => {{
                window.__hyperionIntegrity = null;

                (async () => {{
                    const bytes = new Uint8Array(16);
                    crypto.getRandomValues(bytes);

                    const deviceId = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

                    try {{
                        const res = await fetch("https://gql.twitch.tv/integrity", {{
                            method: "POST",
                            headers: {{
                                "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
                                "X-Device-Id": deviceId,
                                "Authorization": "OAuth {access_token}"
                            }}
                        }});

                        if (!res.ok) {{
                            throw new Error(`integrity request failed with status ${{res.status}}`);
                        }}

                        const data = await res.json();

                        window.__hyperionIntegrity = {{
                            deviceId,
                            token: data.token,
                            expiration: data.expiration
                        }};
                    }} catch (err) {{
                        window.__hyperionIntegrity = {{ deviceId, error: String(err) }};
                    }}
                }})();
            }})();"#
        ),
    )
    .await?;

    for _ in 0..INTEGRITY_POLL_ATTEMPTS {
        tokio::time::sleep(INTEGRITY_POLL_INTERVAL).await;

        let Some(value) = eval_value(window, "window.__hyperionIntegrity").await else {
            continue;
        };

        if value.is_empty() || value == "null" {
            continue;
        }

        return serde_json::from_str::<IntegrityResult>(&value)
            .inspect_err(|err| tracing::error!(%err, "Malformed integrity result: {value}"))
            .ok();
    }

    tracing::warn!("Timed out waiting for the integrity token");

    None
}

async fn refresh_integrity(app: &AppHandle, access_token: &str) -> Option<Integrity> {
    if let Some(stale) = app.get_webview_window(INTEGRITY_WINDOW_LABEL) {
        let _ = stale.close();
    }

    let url = Url::parse("https://www.twitch.tv/")
        .inspect_err(|err| tracing::error!(%err, "Invalid integrity url"))
        .ok()?;

    let window = WebviewWindowBuilder::new(app, INTEGRITY_WINDOW_LABEL, WebviewUrl::External(url))
        .title("Twitch")
        .visible(false)
        .build()
        .inspect_err(|err| tracing::error!(%err, "Failed to open the integrity webview"))
        .ok()?;

    let result = fetch_integrity(&window, access_token).await;
    let _ = window.close();

    if let Some(error) = result.as_ref().and_then(|result| result.error.as_ref()) {
        tracing::warn!(%error, "Failed to refresh the integrity token");
    }

    result?.into_integrity()
}

pub async fn ensure_integrity(app: &AppHandle) -> Option<Integrity> {
    let state = app.state::<Mutex<AppState>>();

    let (access_token, integrity, refresh_lock) = {
        let state = state.lock().await;

        (
            state
                .token
                .as_ref()
                .map(|token| token.access_token.as_str().to_string()),
            state.integrity.clone(),
            Arc::clone(&state.integrity_refresh),
        )
    };

    let access_token = access_token?;

    if let Some(integrity) = integrity.filter(|integrity| !integrity.is_stale()) {
        return Some(integrity);
    }

    let _guard = refresh_lock.lock().await;

    // Whoever held the lock may have refreshed it while we waited.
    let current = state.lock().await.integrity.clone();

    if let Some(integrity) = current.filter(|integrity| !integrity.is_stale()) {
        return Some(integrity);
    }

    let integrity = refresh_integrity(app, &access_token).await?;

    state.lock().await.integrity = Some(integrity.clone());

    if let Err(err) = write_credentials(&TwitchAuth {
        access_token: access_token.clone(),
        integrity: Some(integrity.clone()),
    }) {
        tracing::error!(%err, "Failed to persist the refreshed integrity token");
    }

    tracing::info!("Refreshed integrity token");

    Some(integrity)
}

#[tauri::command]
pub async fn open_twitch_login(app: AppHandle) -> Result<(), String> {
    let auth_url =
        WebviewUrl::External(Url::parse("https://www.twitch.tv/login").map_err(|e| e.to_string())?);

    let auth_window = WebviewWindowBuilder::new(&app, LOGIN_WINDOW_LABEL, auth_url)
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
                let access_token = auth_cookie.value().to_string();
                let result = fetch_integrity(&window_handle, &access_token).await;

                if let Some(error) = result.as_ref().and_then(|result| result.error.as_ref()) {
                    tracing::warn!(%error, "Failed to fetch an integrity token");
                }

                let auth = TwitchAuth {
                    access_token,
                    integrity: result.and_then(|result| result.into_integrity()),
                };

                let _ = app_handle.emit_to("main", "twitch-auth-success", &auth);
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
    auth: TwitchAuth,
) -> Result<AuthUser, Error> {
    let mut state = state.lock().await;

    let token = UserToken::from_token(&state.helix, AccessToken::new(auth.access_token))
        .await
        .map_err(|err| {
            tracing::error!(%err, "Rejected access token");
            Error::Generic(anyhow!("Twitch rejected the access token: {err}"))
        })?;

    write_credentials(&TwitchAuth {
        access_token: token.access_token.as_str().to_string(),
        integrity: auth.integrity.clone(),
    })?;

    let user = AuthUser::from(&token);
    tracing::info!(login = %token.login, "Stored credentials");

    state.integrity = auth.integrity;
    state.token = Some(token);

    Ok(user)
}

#[tauri::command]
pub async fn clear_session(state: State<'_, Mutex<AppState>>) -> Result<(), Error> {
    let mut state = state.lock().await;

    state.token = None;
    state.integrity = None;

    match keyring_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(err.into()),
    }
}

#[tauri::command]
pub async fn get_auth(state: State<'_, Mutex<AppState>>) -> Result<Option<TwitchAuth>, Error> {
    let state = state.lock().await;

    Ok(state.token.as_ref().map(|token| TwitchAuth {
        access_token: token.access_token.as_str().to_string(),
        integrity: state.integrity.clone(),
    }))
}

#[tauri::command]
pub async fn get_integrity(app: AppHandle) -> Result<Option<Integrity>, Error> {
    Ok(ensure_integrity(&app).await)
}

pub fn get_access_token(state: &AppState) -> Result<&UserToken, Error> {
    state.token.as_ref().ok_or_else(|| {
        tracing::error!("Attempted to retrieve access token but no token is set");
        Error::Generic(anyhow!("Access token not set"))
    })
}

pub struct Restored {
    pub token: Option<UserToken>,
    pub integrity: Option<Integrity>,
}

pub async fn restore_credentials(helix: &HelixClient<'static, reqwest::Client>) -> Restored {
    let Some(stored) = read_credentials() else {
        return Restored {
            token: None,
            integrity: None,
        };
    };

    match UserToken::from_token(helix, AccessToken::new(stored.access_token)).await {
        Ok(token) => {
            tracing::info!(login = %token.login, "Restored stored credentials");

            Restored {
                token: Some(token),
                integrity: stored.integrity,
            }
        }
        Err(err) => {
            tracing::warn!(%err, "Stored access token is no longer valid, clearing it");

            // The integrity token is bound to this session, so it goes with it.
            if let Ok(entry) = keyring_entry()
                && let Err(err) = entry.delete_credential()
            {
                tracing::error!(%err, "Failed to delete invalid credentials");
            }

            Restored {
                token: None,
                integrity: None,
            }
        }
    }
}
