use serde::Serialize;
use tauri::AppHandle;

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
