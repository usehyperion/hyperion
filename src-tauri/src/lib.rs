use std::time::Duration;

use auth::{IntegrityState, PendingToken};
use connection::Connection;
use irc::IrcClient;
use pubsub::PubSubClient;
use seventv::SeventTvClient;
use tauri::Manager;
use tauri::async_runtime::{self, Mutex};
use tauri::ipc::Invoke;
use tauri_plugin_svelte::PrettyJsonMarshaler;
use twitch_oauth2::UserToken;

mod api;
mod auth;
mod commands;
mod connection;
mod error;
mod irc;
mod log;
mod pubsub;
mod seventv;
mod ws;

const MAIN_WINDOW_LABEL: &str = "main";

/// How long a request made with [`AppState::http`] may take in all.
const HTTP_TIMEOUT: Duration = Duration::from_secs(15);

pub struct AppState {
    /// Used to validate access tokens with Twitch.
    http: reqwest::Client,
    token: Option<UserToken>,
    /// A stored token that couldn't be validated yet, see
    /// [`auth::validate_pending`].
    unverified: PendingToken,
    integrity: IntegrityState,
    irc: Option<Connection<IrcClient>>,
    seventv: Option<Connection<SeventTvClient>>,
    pubsub: Option<Connection<PubSubClient>>,
}

impl AppState {
    fn new(http: reqwest::Client) -> Self {
        Self {
            http,
            token: None,
            unverified: PendingToken::default(),
            integrity: IntegrityState::default(),
            irc: None,
            seventv: None,
            pubsub: None,
        }
    }

    fn close_connections(&mut self) {
        connection::close(&mut self.irc);
        connection::close(&mut self.pubsub);
        connection::close(&mut self.seventv);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let focused = app
                .get_webview_window(MAIN_WINDOW_LABEL)
                .expect("no main window")
                .set_focus();

            if let Err(err) = focused {
                tracing::error!(%err, "Failed to focus the main window");
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_filter(|label| label == MAIN_WINDOW_LABEL)
                .build(),
        )
        .setup(|app| {
            log::init_tracing(app);

            let app_handle = app.handle();

            let svelte = tauri_plugin_svelte::Builder::new()
                .path(app_handle.path().app_data_dir()?)
                .marshaler(Box::new(PrettyJsonMarshaler))
                .build();

            app_handle.plugin(svelte)?;

            let http = reqwest::Client::builder().timeout(HTTP_TIMEOUT).build()?;
            let mut state = AppState::new(http);

            let (token, integrity) = auth::restore_credentials();
            state.unverified.reset(token);
            state.integrity.reset(integrity);

            app.manage(Mutex::new(state));

            let handle = app_handle.clone();

            async_runtime::spawn(async move {
                auth::ensure_integrity(&handle).await;
            });

            Ok(())
        })
        .invoke_handler(get_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_handler() -> impl Fn(Invoke) -> bool {
    tauri::generate_handler![
        api::join,
        api::leave,
        auth::clear_session,
        auth::get_auth,
        auth::get_integrity,
        auth::open_twitch_login,
        commands::get_about_info,
        irc::connect_irc,
        irc::fetch_recent_messages,
        irc::privmsg,
        log::log,
        log::update_log_level,
        pubsub::connect_pubsub,
        seventv::connect_seventv,
        seventv::sync_seventv,
    ]
}
