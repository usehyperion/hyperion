use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Emitter, Manager, Url};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;
use tracing::Instrument;

use crate::AppState;
use crate::api::set_access_token;
use crate::error::Error;

const ADDR: &str = "127.0.0.1:55331";

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn start_server(app_handle: AppHandle) -> Result<(), Error> {
    tracing::info!("Starting temporary server");

    let listener = match TcpListener::bind(ADDR).await {
        Ok(l) => l,
        Err(e) if e.kind() == std::io::ErrorKind::AddrInUse => {
            tracing::warn!("Server already running");
            return Ok(());
        }
        Err(e) => return Err(e.into()),
    };

    tracing::info!("Server listening on {ADDR}");

    let should_break = Arc::new(AtomicBool::default());

    tokio::spawn(
        async move {
            while !should_break.load(Ordering::SeqCst) {
                let (stream, _) = listener.accept().await?;

                let task_should_break = should_break.clone();
                let app_handle = app_handle.clone();

                tokio::spawn(
                    async move {
                        if let Some(url) = handle_connection(stream).await {
                            tracing::info!("Url received");

                            if !url.is_empty()
                                && task_should_break
                                    .compare_exchange(
                                        false,
                                        true,
                                        Ordering::Relaxed,
                                        Ordering::Relaxed,
                                    )
                                    .is_ok()
                            {
                                handle_url(app_handle, url).await;
                            }
                        }
                    }
                    .in_current_span(),
                );
            }

            tracing::info!("Server stopped");
            Ok::<_, Error>(())
        }
        .in_current_span(),
    );

    Ok(())
}

async fn handle_connection(mut stream: TcpStream) -> Option<String> {
    let mut buffer = [0; 4096];

    if let Err(err) = stream.read(&mut buffer).await {
        tracing::error!(%err, "Failed to read from stream");
        return None;
    }

    let mut headers = [httparse::EMPTY_HEADER; 32];
    let mut request = httparse::Request::new(&mut headers);
    request.parse(&buffer).ok()?;

    let mut host = "127.0.0.1";

    for header in &headers {
        if header.name == "Full-Url" {
            return Some(String::from_utf8_lossy(header.value).to_string());
        }

        if header.name == "Host" && header.value.starts_with(b"localhost") {
            host = "localhost";
        }
    }

    let script = format!(
        r#"<script type="module">
			try {{
				await fetch("http://{host}:55331/callback", {{
					headers: {{
						"Full-Url": location.href
					}}
				}})
			}} catch {{}}
		</script>"#
    );

    let response = format!(
        r"<html>
			<head>{script}</head>
			<body>Return to app</body>
		</html>"
    );

    let header = format!(
        "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{response}",
        response.len()
    );

    if let Err(err) = stream.write_all(header.as_bytes()).await {
        tracing::error!(%err, "Failed to write response");
        return None;
    }

    if let Err(err) = stream.flush().await {
        tracing::error!(%err, "Failed to flush response");
    }

    None
}

#[tracing::instrument(skip_all)]
async fn handle_url(app_handle: AppHandle, url: String) {
    let url = match Url::parse(&url.replace("#", "?")) {
        Ok(parsed) => parsed,
        Err(err) => {
            tracing::error!(%err, "Failed to parse url");
            return;
        }
    };

    let Some(token) = url.query_pairs().find_map(|(k, v)| {
        if k == "access_token" {
            Some(v.to_string())
        } else {
            None
        }
    }) else {
        return;
    };

    let state = app_handle.state::<Mutex<AppState>>();

    if let Some(token_info) = set_access_token(state, token.clone()).await {
        app_handle.emit("tokeninfo", token_info).unwrap();
    }
}
