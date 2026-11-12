use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use anyhow::anyhow;
use serde::{Deserialize, Serialize};
use tauri::webview::PageLoadEvent;
use tauri::{
    AppHandle, Emitter, Manager, State, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent, async_runtime,
};
use tokio::sync::{Mutex, mpsc};
use twitch_oauth2::tokens::errors::ValidationError;
use twitch_oauth2::{AccessToken, UserToken};

use crate::error::Error;
use crate::ws::Backoff;
use crate::{AppState, MAIN_WINDOW_LABEL};

/// The public client id Twitch uses.
const CLIENT_ID: &str = "kimne78kx3ncx6brgo4mv6wki5h1ko";

const LOGIN_WINDOW_LABEL: &str = "twitch-login";
const INTEGRITY_WINDOW_LABEL: &str = "twitch-integrity";

/// How long to wait for the integrity webview's page to load.
const INTEGRITY_PAGE_LOAD_TIMEOUT: Duration = Duration::from_secs(15);

/// How often to check whether the in-page integrity request has finished.
const INTEGRITY_POLL_INTERVAL: Duration = Duration::from_millis(150);

/// How many checks to make before giving up on the integrity request, 15
/// seconds in all.
const INTEGRITY_POLL_ATTEMPTS: u32 = 10;

/// Treat a token as spent slightly before it actually lapses.
const INTEGRITY_EXPIRY_SKEW_MS: i64 = 5 * 60 * 1000;

/// Each refresh opens a webview, so after a failure callers get no token for a
/// while instead of each retrying.
const INTEGRITY_RETRY_DELAY: Duration = Duration::from_secs(30);

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as i64)
        .unwrap_or_default()
}

/// Sent to the main window with `twitch-auth-success` once a login is stored.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SignedIn {
    id: String,
    login: String,
    access_token: String,
}

impl From<&UserToken> for SignedIn {
    fn from(token: &UserToken) -> Self {
        Self {
            id: token.user_id.to_string(),
            login: token.login.to_string(),
            access_token: token.access_token.as_str().to_owned(),
        }
    }
}

/// What the frontend gets back from `get_auth`.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredAuth {
    access_token: String,
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

#[derive(Default)]
pub struct IntegrityState {
    current: Option<Integrity>,
    retry_at: Option<Instant>,
    refresh: Arc<Mutex<()>>,
}

impl IntegrityState {
    pub fn reset(&mut self, current: Option<Integrity>) {
        self.current = current;
        self.retry_at = None;
    }

    fn fresh(&self) -> Option<Integrity> {
        self.current
            .clone()
            .filter(|integrity| !integrity.is_stale())
    }

    fn backing_off(&self) -> bool {
        self.retry_at.is_some_and(|at| Instant::now() < at)
    }
}

/// A stored token that Twitch couldn't be reached to validate, retried with
/// backoff so being offline doesn't mean a request on every call.
#[derive(Default)]
pub struct PendingToken {
    access_token: Option<AccessToken>,
    retry_at: Option<Instant>,
    backoff: Backoff,
    validating: Arc<Mutex<()>>,
}

impl PendingToken {
    pub fn reset(&mut self, access_token: Option<AccessToken>) {
        self.access_token = access_token;
        self.retry_at = None;
        self.backoff.reset();
    }

    fn get(&self) -> Option<&AccessToken> {
        self.access_token.as_ref()
    }

    /// The token unless there is none or it was tried too recently.
    fn due(&self) -> Option<&AccessToken> {
        self.access_token
            .as_ref()
            .filter(|_| self.retry_at.is_none_or(|at| at <= Instant::now()))
    }

    fn defer(&mut self) -> Duration {
        let delay = self.backoff.next_delay();
        self.retry_at = Some(Instant::now() + delay);

        delay
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TwitchAuth {
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
        if let Some(error) = &self.error {
            tracing::warn!(%error, "Integrity request failed");
        }

        Some(Integrity {
            token: self.token?,
            device_id: self.device_id,
            expiration: self.expiration?,
        })
    }
}

#[cfg(not(all(debug_assertions, target_os = "macos")))]
mod store {
    use keyring::Entry;

    use crate::error::Error;

    const SERVICE: &str = "com.hyperion.chat";
    const USER: &str = "session";

    fn entry() -> Result<Entry, Error> {
        Ok(Entry::new(SERVICE, USER)?)
    }

    pub fn get() -> Result<Option<String>, Error> {
        match entry()?.get_password() {
            Ok(stored) => Ok(Some(stored)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(err) => Err(err.into()),
        }
    }

    pub fn set(value: &str) -> Result<(), Error> {
        entry()?.set_password(value)?;
        Ok(())
    }

    pub fn delete() -> Result<(), Error> {
        match entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(err) => Err(err.into()),
        }
    }
}

#[cfg(all(debug_assertions, target_os = "macos"))]
mod store {
    use std::io::{ErrorKind, Write};
    use std::os::unix::fs::OpenOptionsExt;
    use std::path::PathBuf;
    use std::{env, fs};

    use anyhow::anyhow;

    use crate::error::Error;

    fn path() -> Result<PathBuf, Error> {
        let home = env::var_os("HOME").ok_or_else(|| anyhow!("HOME is not set"))?;

        Ok(PathBuf::from(home)
            .join("Library/Application Support/com.hyperion.chat")
            .join("dev-credentials.json"))
    }

    pub fn get() -> Result<Option<String>, Error> {
        match fs::read_to_string(path()?) {
            Ok(stored) => Ok(Some(stored)),
            Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
            Err(err) => Err(anyhow::Error::from(err).into()),
        }
    }

    pub fn set(value: &str) -> Result<(), Error> {
        let path = path()?;

        let write = || -> std::io::Result<()> {
            if let Some(dir) = path.parent() {
                fs::create_dir_all(dir)?;
            }

            fs::OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .mode(0o600)
                .open(&path)?
                .write_all(value.as_bytes())
        };

        write().map_err(|err| anyhow::Error::from(err).into())
    }

    pub fn delete() -> Result<(), Error> {
        match fs::remove_file(path()?) {
            Ok(()) => Ok(()),
            Err(err) if err.kind() == ErrorKind::NotFound => Ok(()),
            Err(err) => Err(anyhow::Error::from(err).into()),
        }
    }
}

fn read_credentials() -> Option<TwitchAuth> {
    let stored = match store::get() {
        Ok(Some(stored)) => stored,
        Ok(None) => {
            tracing::info!("No stored credentials");
            return None;
        }
        Err(err) => {
            tracing::error!(%err, "Failed to read stored credentials");
            return None;
        }
    };

    serde_json::from_str(&stored)
        .inspect_err(|err| tracing::error!(%err, "Stored credentials are malformed"))
        .ok()
}

fn write_credentials(auth: &TwitchAuth) -> Result<(), Error> {
    store::set(&serde_json::to_string(auth)?)
}

fn delete_credentials() -> Result<(), Error> {
    store::delete()
}

fn is_rejection<E: std::error::Error + Send + Sync + 'static>(err: &ValidationError<E>) -> bool {
    matches!(
        err,
        ValidationError::NotAuthorized | ValidationError::InvalidToken(_)
    )
}

async fn eval_value(window: &WebviewWindow, js: impl Into<String>) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let tx = std::sync::Mutex::new(Some(tx));

    window
        .eval_with_callback(js, move |value| {
            if let Ok(mut tx) = tx.lock()
                && let Some(tx) = tx.take()
            {
                // Only fails if the caller stopped waiting
                tx.send(value).ok();
            }
        })
        .inspect_err(|err| tracing::error!(%err, "Failed to evaluate script in webview"))
        .ok()?;

    rx.await.ok()
}

async fn fetch_integrity(window: &WebviewWindow, access_token: &str) -> Option<Integrity> {
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
                                "Client-Id": "{CLIENT_ID}",
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
            .ok()?
            .into_integrity();
    }

    tracing::warn!("Timed out waiting for the integrity token");

    None
}

async fn refresh_integrity(app: &AppHandle, access_token: &str) -> Option<Integrity> {
    if let Some(stale) = app.get_webview_window(INTEGRITY_WINDOW_LABEL) {
        close_window(&stale);
    }

    let url = Url::parse("https://www.twitch.tv/directory/following").unwrap();

    let (loaded_tx, mut loaded) = mpsc::unbounded_channel();

    let window = WebviewWindowBuilder::new(app, INTEGRITY_WINDOW_LABEL, WebviewUrl::External(url))
        .title("Twitch")
        .visible(false)
        .on_page_load(move |_, payload| {
            if payload.event() == PageLoadEvent::Finished {
                // Only fails once nothing is waiting for the load anymore
                loaded_tx.send(()).ok();
            }
        })
        .build()
        .inspect_err(|err| tracing::error!(%err, "Failed to open the integrity webview"))
        .ok()?;

    let integrity = match tokio::time::timeout(INTEGRITY_PAGE_LOAD_TIMEOUT, loaded.recv()).await {
        Ok(Some(())) => fetch_integrity(&window, access_token).await,
        Ok(None) | Err(_) => {
            tracing::warn!("Timed out waiting for the integrity webview to load");
            None
        }
    };

    close_window(&window);

    integrity
}

pub async fn ensure_integrity(app: &AppHandle) -> Option<Integrity> {
    let state = app.state::<Mutex<AppState>>();

    validate_pending(&state).await;

    let (access_token, refresh_lock) = {
        let state = state.lock().await;
        let access_token = state.token.as_ref()?.access_token.as_str().to_string();

        if let Some(integrity) = state.integrity.fresh() {
            return Some(integrity);
        }

        (access_token, Arc::clone(&state.integrity.refresh))
    };

    let _guard = refresh_lock.lock().await;

    {
        // Whoever held the lock may have refreshed it, or failed to, while we
        // waited.
        let state = state.lock().await;

        if let Some(integrity) = state.integrity.fresh() {
            return Some(integrity);
        }

        if state.integrity.backing_off() {
            return None;
        }
    }

    let refreshed = refresh_integrity(app, &access_token).await;

    let mut state = state.lock().await;

    // Logging in or out while the refresh was running replaces the session,
    // which the result must not be stored for.
    let current = state
        .token
        .as_ref()
        .map(|token| token.access_token.as_str());

    if current != Some(access_token.as_str()) {
        return None;
    }

    let Some(integrity) = refreshed else {
        state.integrity.retry_at = Some(Instant::now() + INTEGRITY_RETRY_DELAY);
        return None;
    };

    state.integrity.reset(Some(integrity.clone()));

    if let Err(err) = write_credentials(&TwitchAuth {
        access_token: access_token.clone(),
        integrity: Some(integrity.clone()),
    }) {
        tracing::error!(%err, "Failed to persist the refreshed integrity token");
    }

    tracing::info!("Refreshed integrity token");

    Some(integrity)
}

/// What happens to the login window that could end the login.
enum LoginEvent {
    /// The page changed, possibly because the user just logged in.
    Navigated,
    Closed,
}

#[tauri::command]
pub async fn open_twitch_login(app: AppHandle) -> Result<(), Error> {
    if let Some(window) = app.get_webview_window(LOGIN_WINDOW_LABEL) {
        window.set_focus()?;
        return Ok(());
    }

    let url = WebviewUrl::External(Url::parse("https://www.twitch.tv/login").unwrap());
    let (events_tx, events) = mpsc::unbounded_channel();

    // The handlers only fail to send once the login is over and nothing is
    // listening anymore
    let loaded = events_tx.clone();
    let retitled = events_tx.clone();

    let window = WebviewWindowBuilder::new(&app, LOGIN_WINDOW_LABEL, url)
        .title("Twitch Login")
        .inner_size(500.0, 500.0)
        .resizable(false)
        .on_page_load(move |_, payload| {
            if payload.event() == PageLoadEvent::Finished {
                loaded.send(LoginEvent::Navigated).ok();
            }
        })
        // Catches the page changing without a full load
        .on_document_title_changed(move |_, _| {
            retitled.send(LoginEvent::Navigated).ok();
        })
        .build()?;

    window.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            events_tx.send(LoginEvent::Closed).ok();
        }
    });

    async_runtime::spawn(complete_login(app, window, events));

    Ok(())
}

/// Waits for the login window to either have the auth cookie set, which
/// Twitch does on logging in, or be closed.
async fn complete_login(
    app: AppHandle,
    window: WebviewWindow,
    mut events: mpsc::UnboundedReceiver<LoginEvent>,
) {
    // Without www, since the auth-token cookie is set for .twitch.tv
    let twitch = Url::parse("https://twitch.tv").unwrap();

    loop {
        let Some(LoginEvent::Navigated) = events.recv().await else {
            tracing::info!("Login window closed without logging in");
            return;
        };

        // Read here rather than in the page load handler, since reading
        // cookies from an event handler deadlocks on Windows
        let cookies = match window.cookies_for_url(twitch.clone()) {
            Ok(cookies) => cookies,
            Err(err) => {
                tracing::error!(%err, "Failed to read the login window's cookies");
                continue;
            }
        };

        let Some(cookie) = cookies.into_iter().find(|c| c.name() == "auth-token") else {
            continue;
        };

        let access_token = cookie.value().to_owned();
        let integrity = fetch_integrity(&window, &access_token).await;

        let emitted = match sign_in(&app, access_token, integrity).await {
            Ok(signed_in) => app.emit_to(MAIN_WINDOW_LABEL, "twitch-auth-success", &signed_in),
            Err(err) => app.emit_to(MAIN_WINDOW_LABEL, "twitch-auth-error", err.to_string()),
        };

        if let Err(err) = emitted {
            tracing::error!(%err, "Failed to emit the login result");
        }

        close_window(&window);

        return;
    }
}

fn close_window(window: &WebviewWindow) {
    if let Err(err) = window.close() {
        tracing::error!(%err, label = window.label(), "Failed to close window");
    }
}

/// Validates and stores a fresh session, replacing any previous one along with
/// the connections made with its token.
async fn sign_in(
    app: &AppHandle,
    access_token: String,
    integrity: Option<Integrity>,
) -> Result<SignedIn, Error> {
    let state = app.state::<Mutex<AppState>>();
    let http = state.lock().await.http.clone();

    let token = UserToken::from_token(&http, AccessToken::new(access_token))
        .await
        .map_err(|err| {
            tracing::error!(%err, "Rejected access token");
            Error::Generic(anyhow!("Twitch rejected the access token: {err}"))
        })?;

    let mut state = state.lock().await;

    write_credentials(&TwitchAuth {
        access_token: token.access_token.as_str().to_string(),
        integrity: integrity.clone(),
    })?;

    let signed_in = SignedIn::from(&token);
    tracing::info!(login = %token.login, "Stored credentials");

    state.unverified.reset(None);
    state.integrity.reset(integrity);

    // Connections authenticate once, when they open, so ones opened with the
    // previous token would keep using it. The frontend connects again.
    if state.token.replace(token).is_some() {
        state.close_connections();
    }

    Ok(signed_in)
}

#[tauri::command]
pub async fn clear_session(state: State<'_, Mutex<AppState>>) -> Result<(), Error> {
    let mut state = state.lock().await;

    state.token = None;
    state.unverified.reset(None);
    state.integrity.reset(None);
    state.close_connections();

    delete_credentials()
}

/// The stored session's access token, or `None` if the user has to log in.
/// A token that couldn't be validated yet is returned too, so being offline at
/// startup doesn't sign the user out.
#[tauri::command]
pub async fn get_auth(state: State<'_, Mutex<AppState>>) -> Result<Option<StoredAuth>, Error> {
    validate_pending(&state).await;

    let state = state.lock().await;

    let access_token = state
        .token
        .as_ref()
        .map(|token| &token.access_token)
        .or(state.unverified.get());

    Ok(access_token.map(|token| StoredAuth {
        access_token: token.as_str().to_owned(),
    }))
}

#[tauri::command]
pub async fn get_integrity(app: AppHandle) -> Result<Option<Integrity>, Error> {
    Ok(ensure_integrity(&app).await)
}

/// Validates the stored token again if Twitch couldn't be reached to validate
/// it before e.g. because the network wasn't up yet at startup.
///
/// The state is only locked around the request, not across it.
pub async fn validate_pending(state: &Mutex<AppState>) {
    let validating = {
        let state = state.lock().await;

        if state.unverified.due().is_none() {
            return;
        }

        Arc::clone(&state.unverified.validating)
    };

    let _guard = validating.lock().await;

    let (http, access_token) = {
        let state = state.lock().await;

        let Some(access_token) = state.unverified.due() else {
            return;
        };

        (state.http.clone(), access_token.clone())
    };

    let validated = UserToken::from_token(&http, access_token.clone()).await;
    let mut state = state.lock().await;

    if state.unverified.get() != Some(&access_token) {
        return;
    }

    match validated {
        Ok(token) => {
            tracing::info!(login = %token.login, "Validated stored credentials");

            state.unverified.reset(None);
            state.token = Some(token);
        }
        Err(err) if is_rejection(&err) => {
            tracing::warn!(%err, "Stored access token is no longer valid, clearing it");

            state.unverified.reset(None);
            state.integrity.reset(None);

            if let Err(err) = delete_credentials() {
                tracing::error!(%err, "Failed to delete invalid credentials");
            }
        }
        Err(err) => {
            let retry_in = state.unverified.defer();
            tracing::warn!(%err, ?retry_in, "Still unable to validate the stored access token");
        }
    }
}

pub fn get_access_token(state: &AppState) -> Result<&UserToken, Error> {
    state.token.as_ref().ok_or_else(|| {
        tracing::error!("Attempted to retrieve access token but no token is set");
        Error::Generic(anyhow!("Access token not set"))
    })
}

pub fn restore_credentials() -> (Option<AccessToken>, Option<Integrity>) {
    read_credentials().map_or((None, None), |stored| {
        (
            Some(AccessToken::new(stored.access_token)),
            stored.integrity,
        )
    })
}
