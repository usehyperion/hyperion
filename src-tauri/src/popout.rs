//! Popout windows opened by the main window with `window.open`.
//!
//! A popout shares the main window's webview configuration, which makes it a
//! real popup of the main window rather than an unrelated webview. The main
//! window can then render into it directly, so popouts share its memory
//! instead of booting the app again.

use std::sync::atomic::{AtomicU32, Ordering};

use tauri::webview::{NewWindowFeatures, NewWindowResponse};
use tauri::{AppHandle, Runtime, WebviewUrl, WebviewWindowBuilder};

const LABEL_PREFIX: &str = "popout-";

static NEXT_ID: AtomicU32 = AtomicU32::new(0);

pub fn open<R: Runtime>(app: &AppHandle<R>, features: NewWindowFeatures) -> NewWindowResponse<R> {
    let label = format!("{LABEL_PREFIX}{}", NEXT_ID.fetch_add(1, Ordering::Relaxed));
    let url = WebviewUrl::External("about:blank".parse().expect("about:blank is a valid url"));

    let built = WebviewWindowBuilder::new(app, label, url)
        .window_features(features)
        .min_inner_size(360.0, 400.0)
        .on_document_title_changed(|window, title| {
            if let Err(error) = window.set_title(&title) {
                tracing::error!(%error, "Failed to set the popout title");
            }
        })
        .build();

    match built {
        Ok(window) => NewWindowResponse::Create { window },
        Err(error) => {
            tracing::error!(%error, "Failed to open popout");
            NewWindowResponse::Deny
        }
    }
}
