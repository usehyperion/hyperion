use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::MAIN_WINDOW_LABEL;
use crate::error::Error;

const REPLY_ACTION: &str = "__reply";
const REPLY_LABEL: &str = "Reply";

#[derive(Debug, Deserialize)]
pub struct NotifyAction {
    id: String,
    label: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NotifyUrgency {
    Low,
    Normal,
    Critical,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotifyOptions {
    title: String,
    subtitle: Option<String>,
    #[serde(default)]
    body: String,
    #[serde(default)]
    actions: Vec<NotifyAction>,
    reply: Option<String>,
    urgency: Option<NotifyUrgency>,
    timeout: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum NotifyResponse {
    /// The notification itself was clicked.
    Default,
    /// One of the notification's actions was clicked.
    Action { id: String },
    /// The user replied. `text` is `None` where the platform has no inline
    /// reply field and the user clicked the "Reply" button instead.
    Reply { text: Option<String> },
    /// The notification was dismissed or expired.
    Closed,
}

impl NotifyResponse {
    /// Whether the user expects the app to come to the front, which is
    /// anything but a dismissal or a reply sent from the notification.
    fn activates(&self) -> bool {
        matches!(
            self,
            Self::Default | Self::Action { .. } | Self::Reply { text: None }
        )
    }
}

#[tauri::command]
#[tracing::instrument(skip_all, fields(title = %options.title))]
pub async fn notify(app: AppHandle, options: NotifyOptions) -> Result<NotifyResponse, Error> {
    let response = platform::show(&app, &options).await?;

    if response.activates() {
        focus_main_window(&app);
    }

    Ok(response)
}

fn focus_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    let focused = window
        .unminimize()
        .and_then(|()| window.show())
        .and_then(|()| window.set_focus());

    if let Err(err) = focused {
        tracing::error!(%err, "Failed to focus the main window");
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use std::time::Duration;

    use mac_usernotifications::{Action, InterruptionLevel, Notification, NotificationResponse};
    use tauri::AppHandle;

    use super::{NotifyOptions, NotifyResponse, NotifyUrgency, REPLY_ACTION, REPLY_LABEL};

    pub async fn show(_app: &AppHandle, options: &NotifyOptions) -> anyhow::Result<NotifyResponse> {
        if !mac_usernotifications::request_auth().await? {
            anyhow::bail!("notification permission denied");
        }

        let handle = build(options).send().await?;

        // Resolves from the delegate on the main run loop, so nothing is
        // blocked while the user hasn't responded.
        Ok(handle.response().await?.into())
    }

    fn build(options: &NotifyOptions) -> Notification {
        let mut notification = Notification::new()
            .title(&options.title)
            .message(&options.body)
            .maybe_subtitle(options.subtitle.as_deref());

        if let Some(urgency) = options.urgency {
            notification = notification.interruption_level(urgency.into());
        }

        // Without a timeout the notification stays in Notification Center.
        if let Some(ms) = options.timeout.filter(|&ms| ms > 0) {
            notification = notification.timeout(Duration::from_millis(ms.into()));
        }

        for action in &options.actions {
            notification = notification.action(Action::button(&action.id, &action.label));
        }

        if let Some(placeholder) = &options.reply {
            notification = notification.action(Action::reply(
                REPLY_ACTION,
                REPLY_LABEL,
                "Send",
                placeholder,
            ));
        }

        notification
    }

    impl From<NotifyUrgency> for InterruptionLevel {
        fn from(urgency: NotifyUrgency) -> Self {
            match urgency {
                NotifyUrgency::Low => InterruptionLevel::Passive,
                NotifyUrgency::Normal => InterruptionLevel::Active,
                NotifyUrgency::Critical => InterruptionLevel::TimeSensitive,
            }
        }
    }

    impl From<NotificationResponse> for NotifyResponse {
        fn from(response: NotificationResponse) -> Self {
            if response.is_reply() {
                Self::Reply {
                    text: response.reply_text,
                }
            } else if response.close_reason.is_some() {
                Self::Closed
            } else if response.is_default_action() {
                Self::Default
            } else {
                Self::Action {
                    id: response.action_identifier,
                }
            }
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use notify_rust::{Notification, NotificationResponse, Timeout, Urgency};
    use tauri::AppHandle;

    use super::{NotifyOptions, NotifyResponse, NotifyUrgency, REPLY_ACTION, REPLY_LABEL};

    #[cfg(unix)]
    pub async fn show(_app: &AppHandle, options: &NotifyOptions) -> anyhow::Result<NotifyResponse> {
        let handle = build(options).show_async().await?;
        let mut response = None;

        // Listens for the server's signals on the handle's D-Bus connection,
        // so nothing is blocked while the user hasn't responded.
        handle
            .wait_for_action_async(|res: &NotificationResponse| response = Some(res.clone()))
            .await;

        Ok(response.map_or(NotifyResponse::Closed, NotifyResponse::from))
    }

    #[cfg(windows)]
    pub async fn show(app: &AppHandle, options: &NotifyOptions) -> anyhow::Result<NotifyResponse> {
        let mut notification = build(options);

        let exe = std::env::current_exe()?;

        let in_target = exe
            .parent()
            .is_some_and(|dir| dir.ends_with("target/debug") || dir.ends_with("target/release"));

        // Unbundled builds have no registered app id, so let them fall back
        // to PowerShell's instead of failing.
        if !in_target {
            notification.app_id(&app.config().identifier);
        }

        let handle = notification.show()?;

        // Windows only offers a blocking wait, which ends once the toast is
        // clicked, dismissed, or times out into Action Center.
        let response = tauri::async_runtime::spawn_blocking(move || {
            let mut response = None;

            handle.wait_for_response(|res: &NotificationResponse| response = Some(res.clone()))?;

            Ok::<_, notify_rust::error::Error>(response)
        })
        .await??;

        Ok(response.map_or(NotifyResponse::Closed, NotifyResponse::from))
    }

    fn build(options: &NotifyOptions) -> Notification {
        let mut notification = Notification::new();

        notification.summary(&options.title).body(&options.body);

        if let Some(subtitle) = &options.subtitle {
            notification.subtitle(subtitle);
        }

        if let Some(urgency) = options.urgency {
            notification.urgency(urgency.into());
        }

        if let Some(timeout) = options.timeout {
            notification.timeout(match timeout {
                0 => Timeout::Never,
                ms => Timeout::Milliseconds(ms),
            });
        }

        // XDG servers only report clicks on the body when a "default" action
        // exists. Most don't show it as a button.
        #[cfg(unix)]
        notification.action("default", "Open");

        for action in &options.actions {
            notification.action(&action.id, &action.label);
        }

        if options.reply.is_some() {
            notification.action(REPLY_ACTION, REPLY_LABEL);
        }

        notification
    }

    impl From<NotifyUrgency> for Urgency {
        fn from(urgency: NotifyUrgency) -> Self {
            match urgency {
                NotifyUrgency::Low => Urgency::Low,
                NotifyUrgency::Normal => Urgency::Normal,
                NotifyUrgency::Critical => Urgency::Critical,
            }
        }
    }

    impl From<NotificationResponse> for NotifyResponse {
        fn from(response: NotificationResponse) -> Self {
            match response {
                NotificationResponse::Default => Self::Default,
                NotificationResponse::Reply(text) => Self::Reply { text: Some(text) },
                NotificationResponse::Closed(_) => Self::Closed,
                NotificationResponse::Action(id) if id == REPLY_ACTION => {
                    Self::Reply { text: None }
                }
                NotificationResponse::Action(id) => Self::Action { id },
            }
        }
    }
}
