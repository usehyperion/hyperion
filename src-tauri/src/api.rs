use anyhow::anyhow;
use tauri::State;
use tokio::sync::Mutex;

use crate::error::Error;
use crate::{AppState, irc};

/// Rejects an empty channel login, which no channel has and which the clients
/// key their per-channel state by.
pub fn ensure_login(login: &str) -> Result<(), Error> {
    if login.is_empty() {
        tracing::error!("Received an empty channel login");
        return Err(Error::Generic(anyhow!("Channel login is empty")));
    }

    Ok(())
}

/// Joins a channel, or updates what is followed in a joined one, e.g. after
/// being unbanned or after moderator status changed. Each client only sends
/// what differs from what it already has.
#[tracing::instrument(skip(state, is_mod))]
#[tauri::command]
pub async fn join(
    state: State<'_, Mutex<AppState>>,
    id: String,
    stv_id: Option<String>,
    set_id: Option<String>,
    login: String,
    is_mod: bool,
) -> Result<(), Error> {
    ensure_login(&login)?;
    tracing::info!("Joining {login}");

    let state = state.lock().await;
    let irc = irc::client(&state)?;

    if let Some(seventv) = &state.seventv {
        seventv
            .client()
            .join(&login, &id, stv_id.as_deref(), set_id.as_deref());
    }

    if let Some(pubsub) = &state.pubsub {
        pubsub.client().listen(&login, &id, is_mod);
    }

    irc.join(login);

    Ok(())
}

#[tauri::command]
pub async fn leave(state: State<'_, Mutex<AppState>>, login: String) -> Result<(), Error> {
    ensure_login(&login)?;
    tracing::info!("Leaving {login}");

    let state = state.lock().await;
    let irc = irc::client(&state)?;

    if let Some(seventv) = &state.seventv {
        seventv.client().leave(&login);
    }

    if let Some(pubsub) = &state.pubsub {
        pubsub.client().unlisten(&login);
    }

    irc.part(login);

    Ok(())
}
