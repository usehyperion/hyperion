use anyhow::anyhow;
use futures::TryStreamExt;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager, State, async_runtime};
use tokio::sync::Mutex;
use tracing::Instrument;
use twitch_api::eventsub::EventType;
use twitch_api::twitch_oauth2::{AccessToken, UserToken};

use crate::AppState;
use crate::error::Error;

#[derive(Debug, Deserialize)]
pub struct Response<T> {
    pub data: T,
}

pub fn get_access_token(state: &AppState) -> Result<&UserToken, Error> {
    state.token.as_ref().ok_or_else(|| {
        tracing::error!("Attempted to retrieve access token but no token is set");
        Error::Generic(anyhow!("Access token not set"))
    })
}

#[derive(Clone, Serialize)]
pub struct TokenInfo {
    user_id: String,
    access_token: String,
}

pub async fn set_access_token(
    state: State<'_, Mutex<AppState>>,
    token: String,
) -> Option<TokenInfo> {
    let mut state = state.lock().await;

    state.token = UserToken::from_token(&state.helix, AccessToken::from(token))
        .await
        .ok();

    if let Some(ref token) = state.token {
        let raw_token = token.access_token.as_str();
        tracing::debug!("Set access token to {}", raw_token);

        Some(TokenInfo {
            user_id: token.user_id.to_string(),
            access_token: raw_token.to_string(),
        })
    } else {
        None
    }
}

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

    let (token, irc, eventsub, seventv) = {
        let state = state.lock().await;
        let token = get_access_token(&state)?;

        let Some(irc) = state.irc.clone() else {
            tracing::error!("No IRC connection");
            return Err(Error::Generic(anyhow!("No IRC connection")));
        };

        (
            token.clone(),
            irc,
            state.eventsub.clone(),
            state.seventv.clone(),
        )
    };

    let login_clone = login.clone();
    let id_clone = id.clone();

    async_runtime::spawn(
        async move {
            if let Some(eventsub) = eventsub {
                let ch_cond = json!({
                    "broadcaster_user_id": id_clone
                });

                let ch_with_user_cond = json!({
                    "broadcaster_user_id": id_clone,
                    "user_id": token.user_id
                });

                let ch_with_mod_cond = json!({
                    "broadcaster_user_id": id_clone,
                    "moderator_user_id": token.user_id
                });

                use EventType as Ev;

                let mut events = vec![
                    (Ev::ChannelChatUserMessageHold, &ch_with_user_cond),
                    (Ev::ChannelChatUserMessageUpdate, &ch_with_user_cond),
                    (Ev::ChannelSubscriptionEnd, &ch_cond),
                    (Ev::ChannelUpdate, &ch_cond),
                    (Ev::StreamOffline, &ch_cond),
                    (Ev::StreamOnline, &ch_cond),
                ];

                if is_mod {
                    let mod_events = vec![
                        (Ev::AutomodMessageHold, &ch_with_mod_cond),
                        (Ev::AutomodMessageUpdate, &ch_with_mod_cond),
                        (Ev::ChannelModerate, &ch_with_mod_cond),
                        (Ev::ChannelSuspiciousUserMessage, &ch_with_mod_cond),
                        (Ev::ChannelSuspiciousUserUpdate, &ch_with_mod_cond),
                        (Ev::ChannelUnbanRequestCreate, &ch_with_mod_cond),
                        (Ev::ChannelUnbanRequestResolve, &ch_with_mod_cond),
                        (Ev::ChannelWarningAcknowledge, &ch_with_mod_cond),
                    ];

                    events.extend(mod_events)
                }

                if token.user_id.take() == id_clone {
                    let broadcaster_events = vec![
                        (Ev::ChannelPointsAutomaticRewardRedemptionAdd, &ch_cond),
                        (Ev::ChannelPointsCustomRewardRedemptionAdd, &ch_cond),
                        (Ev::ChannelPollBegin, &ch_cond),
                        (Ev::ChannelPollEnd, &ch_cond),
                        (Ev::ChannelPollProgress, &ch_cond),
                        (Ev::ChannelPredictionBegin, &ch_cond),
                        (Ev::ChannelPredictionEnd, &ch_cond),
                        (Ev::ChannelPredictionLock, &ch_cond),
                        (Ev::ChannelPredictionProgress, &ch_cond),
                    ];

                    events.extend(broadcaster_events);
                }

                if let Err(err) = eventsub.subscribe_all(login_clone.as_str(), events).await {
                    tracing::error!(%err, "Failed to batch subscribe to EventSub events");
                }
            }

            if let Some(seventv) = seventv {
                let channel_cond = json!({
                    "ctx": "channel",
                    "platform": "TWITCH",
                    "id": id_clone
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

    if let Some(ref eventsub) = state.eventsub {
        eventsub.unsubscribe_all(&channel).await?;
    }

    if let Some(ref seventv) = state.seventv {
        seventv.unsubscribe_all(&channel).await;
    }

    if let Some(ref irc) = state.irc {
        irc.part(channel);
    }

    Ok(())
}

#[tauri::command]
pub async fn rejoin(state: State<'_, Mutex<AppState>>, channel: String) -> Result<(), Error> {
    tracing::info!("Rejoining {channel}");

    let (eventsub, irc) = {
        let state = state.lock().await;

        (state.eventsub.clone(), state.irc.clone())
    };

    if let Some(eventsub) = eventsub {
        let subscriptions = eventsub.unsubscribe_all(&channel).await?;
        let subs_ref: Vec<_> = subscriptions.iter().map(|(e, c)| (*e, c)).collect();

        eventsub.subscribe_all(&channel, subs_ref).await?;
    }

    if let Some(irc) = irc {
        irc.join(channel);
    }

    Ok(())
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn fetch_user_emotes(app_handle: AppHandle) {
    async_runtime::spawn(
        async move {
            let state = app_handle.state::<Mutex<AppState>>();
            let state = state.lock().await;

            let Some(token) = state.token.as_ref() else {
                return Ok::<_, Error>(());
            };

            let emotes: Vec<_> = state
                .helix
                .get_user_emotes(&token.user_id, token)
                .try_collect()
                .await?;

            tracing::info!("Fetched {} user emotes", emotes.len());

            app_handle.emit("useremotes", emotes).unwrap();
            Ok(())
        }
        .in_current_span(),
    );
}
