use serde::Deserialize;
use tauri::{App, Manager, State};
use time::UtcOffset;
use time::macros::format_description;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::fmt::time::OffsetTime;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{EnvFilter, Layer, Registry, fmt, reload};

type LogHandle = reload::Handle<EnvFilter, Registry>;

pub fn init_tracing(app: &App) {
    let time_format = format_description!(
        "[year]-[month padding:zero]-[day padding:zero] [hour]:[minute]:[second].[subsecond digits:3]"
    );
    let time_offset = UtcOffset::current_local_offset().unwrap_or(UtcOffset::UTC);
    let timer = OffsetTime::new(time_offset, time_format);

    let path = app
        .path()
        .app_log_dir()
        .expect("failed to get app log directory");

    if !path.exists() {
        let _ = std::fs::create_dir_all(&path);
    }

    let appender = RollingFileAppender::builder()
        .rotation(Rotation::DAILY)
        .filename_prefix("hyperion")
        .filename_suffix("log")
        .max_log_files(5)
        .build(path)
        .expect("failed to create rolling file appender");

    let (writer, guard) = tracing_appender::non_blocking(appender);

    let (file_filter, reload_handle) =
        reload::Layer::new(EnvFilter::new("hyperion_lib=info,webview=info"));

    let file_layer = fmt::layer()
        .with_ansi(false)
        .with_timer(timer.clone())
        .with_writer(writer)
        .with_filter(file_filter);

    let io_layer = fmt::layer()
        .with_ansi(true)
        .with_timer(timer)
        .with_writer(std::io::stdout)
        .with_filter(EnvFilter::new("hyperion_lib=debug,webview=debug"));

    tracing_subscriber::registry()
        .with(file_layer)
        .with(io_layer)
        .init();

    app.manage(reload_handle);
    app.manage(guard);
}

#[derive(Debug)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

impl<'de> Deserialize<'de> for LogLevel {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;

        match s.to_lowercase().as_str() {
            "trace" => Ok(LogLevel::Trace),
            "debug" => Ok(LogLevel::Debug),
            "info" => Ok(LogLevel::Info),
            "warn" => Ok(LogLevel::Warn),
            "error" => Ok(LogLevel::Error),
            other => Err(serde::de::Error::unknown_variant(
                other,
                &["trace", "debug", "info", "warn", "error"],
            )),
        }
    }
}

#[tauri::command]
#[tracing::instrument(skip(handle))]
pub fn update_log_level(level: LogLevel, handle: State<LogHandle>) {
    let filter = match level {
        LogLevel::Trace => "hyperion_lib=trace,webview=trace",
        LogLevel::Debug => "hyperion_lib=debug,webview=debug",
        LogLevel::Info => "hyperion_lib=info,webview=info",
        LogLevel::Warn => "hyperion_lib=warn,webview=warn",
        LogLevel::Error => "hyperion_lib=error,webview=error",
    };

    if let Err(err) = handle.reload(EnvFilter::new(filter)) {
        tracing::error!(%err, "Failed to update log level");
    }
}

#[tauri::command]
pub fn log(level: LogLevel, message: String) {
    macro_rules! emit {
		($level:expr) => {
			tracing::event!(target: "webview", $level, %message)
		};
	}

    match level {
        LogLevel::Trace => emit!(tracing::Level::TRACE),
        LogLevel::Debug => emit!(tracing::Level::DEBUG),
        LogLevel::Info => emit!(tracing::Level::INFO),
        LogLevel::Warn => emit!(tracing::Level::WARN),
        LogLevel::Error => emit!(tracing::Level::ERROR),
    }
}
