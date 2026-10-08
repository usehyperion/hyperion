use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_cache::CacheExt;

use crate::HTTP;
use crate::error::Error;
use crate::irc::message::{IrcMessage, ServerMessage};

#[derive(Debug, Deserialize)]
struct RecentMessages {
    #[serde(default)]
    messages: Vec<String>,
}

#[tracing::instrument]
#[tauri::command]
pub async fn fetch_recent_messages(
    channel: String,
    limit: u32,
) -> Result<Vec<ServerMessage>, Error> {
    const BASE_URL: &str = "https://recent-messages.robotty.de/api/v2/recent-messages";

    if limit == 0 {
        tracing::debug!("History limit is 0, skipping request");
        return Ok(Vec::new());
    }

    let response: RecentMessages = HTTP
        .get(format!("{BASE_URL}/{channel}?limit={limit}",))
        .send()
        .await?
        .json()
        .await?;

    tracing::info!("Fetched {} recent messages", response.messages.len());

    let server_messages = response
        .messages
        .into_iter()
        .filter_map(|msg| {
            let irc_message = match IrcMessage::parse(&msg) {
                Ok(msg) => msg,
                Err(err) => {
                    tracing::warn!(%err, "Failed to parse IRC message");
                    return None;
                }
            };

            match ServerMessage::try_from(irc_message) {
                Ok(server_msg) => Some(server_msg),
                Err(err) => {
                    tracing::warn!(%err, "Failed to convert to ServerMessage");
                    None
                }
            }
        })
        .collect();

    Ok(server_messages)
}

#[tauri::command]
pub fn get_cache_size(app_handle: AppHandle) -> i64 {
    let cache_path = app_handle.cache().get_cache_file_path();

    match std::fs::metadata(cache_path) {
        Ok(metadata) => {
            let size = metadata.len() as i64;

            // Empty cache files contain an empty object i.e. "{}"
            if size == 2 { 0 } else { size }
        }
        Err(error) => {
            tracing::error!(%error, "Failed to get cache size");
            0
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AboutInfo {
    name: String,
    version: String,
    commit: Option<&'static str>,
    tauri_version: String,
    os: String,
    webview: String,
}

#[tauri::command]
pub fn get_about_info(app_handle: AppHandle) -> AboutInfo {
    use tauri_plugin_os as os;

    let pkg_info = app_handle.package_info();

    AboutInfo {
        name: pkg_info.name.clone(),
        version: pkg_info.version.to_string(),
        commit: option_env!("HYPERION_COMMIT"),
        tauri_version: tauri::VERSION.to_string(),
        os: format!("{} {}", os::platform(), os::version()),
        webview: format!(
            "{} {}",
            if std::env::consts::FAMILY == "windows" {
                "WebView2"
            } else {
                "WebKit"
            },
            tauri::webview_version().unwrap_or_default()
        ),
    }
}
