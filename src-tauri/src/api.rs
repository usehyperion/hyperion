use anyhow::anyhow;
use serde_json::json;
use tauri::{State, async_runtime};
use tokio::sync::Mutex;
use tracing::Instrument;

use crate::error::Error;
use crate::{AppState, auth};

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
    tracing::info!("Joining {login}");

    let (token, irc, seventv, pubsub) = {
        let state = state.lock().await;
        let token = auth::get_access_token(&state)?;

        let Some(irc) = state.irc.clone() else {
            tracing::error!("No IRC connection");
            return Err(Error::Generic(anyhow!("No IRC connection")));
        };

        (
            token.clone(),
            irc,
            state.seventv.clone(),
            state.pubsub.clone(),
        )
    };

    let login_clone = login.clone();

    async_runtime::spawn(
        async move {
            if let Some(seventv) = seventv {
                let channel_cond = json!({
                    "ctx": "channel",
                    "platform": "TWITCH",
                    "id": id
                });

                seventv
                    .subscribe(&login_clone, "cosmetic.create", &channel_cond)
                    .await;

                seventv
                    .subscribe(&login_clone, "entitlement.create", &channel_cond)
                    .await;

                if let Some(ref set_id) = set_id {
                    seventv
                        .subscribe(&login_clone, "emote_set.*", &json!({ "object_id": set_id }))
                        .await;
                }

                if let Some(ref stv_id) = stv_id {
                    seventv
                        .subscribe(&login_clone, "user.update", &json!({ "object_id": stv_id }))
                        .await;
                }
            }

            if let Some(pubsub) = pubsub {
                let user_id = token.user_id;

                let base_topics = vec![
                    format!("automod-queue.{}.{id}", user_id),
                    format!("broadcast-settings-update.{id}"),
                    format!("community-points-channel-v1.{id}"),
                    format!("pinned-chat-updates-v1.{id}"),
                    format!("predictions-channel-v1.{id}"),
                    format!("polls.{id}"),
                    format!("video-playback-by-id.{id}"),
                ];

                let mut topics = base_topics;

                if is_mod {
                    let mod_topics = vec![
                        format!("channel-unban-requests.{}.{id}", user_id),
                        format!("chat_moderator_actions.{}.{id}", user_id),
                        format!("low-trust-users.{}.{id}", user_id),
                    ];

                    topics.reserve(mod_topics.len());
                    topics.extend(mod_topics);
                }

                pubsub.listen(&login_clone, &topics).await;
            }
        }
        .in_current_span(),
    );

    irc.join(login);

    Ok(())
}

#[tauri::command]
pub async fn leave(state: State<'_, Mutex<AppState>>, channel: String) -> Result<(), Error> {
    tracing::info!("Leaving {channel}");

    let state = state.lock().await;

    if let Some(ref seventv) = state.seventv {
        seventv.unsubscribe_all(&channel).await;
    }

    if let Some(ref pubsub) = state.pubsub {
        pubsub.unlisten(&channel).await;
    }

    if let Some(ref irc) = state.irc {
        irc.part(channel);
    }

    Ok(())
}

#[tauri::command]
pub async fn rejoin(state: State<'_, Mutex<AppState>>, channel: String) -> Result<(), Error> {
    tracing::info!("Rejoining {channel}");

    let (pubsub, irc) = {
        let state = state.lock().await;

        (state.pubsub.clone(), state.irc.clone())
    };

    if let Some(pubsub) = pubsub {
        pubsub.relisten(&channel).await;
    }

    if let Some(irc) = irc {
        irc.join(channel);
    }

    Ok(())
}
