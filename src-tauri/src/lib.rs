#![feature(try_blocks)]
#![allow(clippy::result_large_err)]

use std::sync::{Arc, LazyLock};

use eventsub::EventSubClient;
use irc::IrcClient;
use reqwest::header::HeaderMap;
use seventv::SeventTvClient;
use tauri::async_runtime::{self, Mutex};
use tauri::ipc::Invoke;
use tauri::{Manager, WindowEvent};
use tauri_plugin_cache::{CacheConfig, CompressionMethod};
use tauri_plugin_svelte::ManagerExt;
use twitch_api::HelixClient;
use twitch_api::twitch_oauth2::{AccessToken, UserToken};

mod api;
mod commands;
mod error;
mod eventsub;
mod irc;
mod json;
mod log;
mod server;
mod seventv;

const CLIENT_ID: &str = "kimne78kx3ncx6brgo4mv6wki5h1ko";

pub static HTTP: LazyLock<reqwest::Client> = LazyLock::new(|| {
    let mut headers = HeaderMap::new();
    headers.insert("Client-Id", CLIENT_ID.parse().unwrap());
    headers.insert("Content-Type", "application/json".parse().unwrap());

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .unwrap()
});

pub struct AppState {
    helix: HelixClient<'static, reqwest::Client>,
    token: Option<UserToken>,
    irc: Option<IrcClient>,
    eventsub: Option<Arc<EventSubClient>>,
    seventv: Option<Arc<SeventTvClient>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            helix: HelixClient::new(),
            token: None,
            irc: None,
            eventsub: None,
            seventv: None,
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut system = sysinfo::System::new_all();
    system.refresh_all();

    let mut builder = tauri::Builder::default().plugin(tauri_plugin_process::init());
    let mut state = AppState::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    builder
        .plugin(tauri_plugin_cache::init_with_config(CacheConfig {
            compression_level: Some(8),
            compression_method: Some(CompressionMethod::Lzma2),
            ..Default::default()
        }))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            log::init_tracing(app);

            let app_handle = app.handle();

            let svelte = tauri_plugin_svelte::Builder::new()
                .path(app_handle.path().app_data_dir()?)
                .marshaler(Box::new(json::JsonMarshaler))
                .build();

            app_handle.plugin(svelte)?;

            async_runtime::block_on(async {
                let stored_token = app_handle
                    .svelte()
                    .get_raw("storage", "user")
                    .and_then(|user| user["token"].as_str().map(|t| t.to_string()));

                let access_token = if let Some(token) = stored_token {
                    UserToken::from_token(&state.helix, AccessToken::from(token))
                        .await
                        .ok()
                } else {
                    None
                };

                if let Some(ref token) = access_token {
                    tracing::debug!(
                        token = token.access_token.as_str(),
                        "Using access token from storage",
                    );
                }

                state.token = access_token;
            });

            app.manage(Mutex::new(state));
            app.manage(system);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let app_handle = window.app_handle();

                match window.label() {
                    "main" => {
                        if let Some(settings_win) =
                            window.app_handle().get_webview_window("settings")
                        {
                            settings_win
                                .close()
                                .expect("failed to close settings window");
                        }
                    }
                    "settings" => {
                        app_handle
                            .svelte()
                            .save("settings")
                            .expect("failed to save settings while closing window");
                    }
                    _ => (),
                }
            }
        })
        .invoke_handler(get_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_handler() -> impl Fn(Invoke) -> bool {
    tauri::generate_handler![
        api::join,
        api::leave,
        api::rejoin,
        api::fetch_user_emotes,
        commands::fetch_recent_messages,
        commands::get_cache_size,
        commands::get_debug_info,
        eventsub::connect_eventsub,
        irc::connect_irc,
        log::log,
        log::update_log_level,
        server::start_server,
        seventv::connect_seventv,
        seventv::resub_emote_set,
    ]
}
