use anyhow::anyhow;
use keyring::Entry;
use serde::Deserialize;
use serde_json::json;
use tauri::{State, async_runtime};
use tokio::sync::Mutex;
use tracing::Instrument;
use twitch_api::HelixClient;
use twitch_api::eventsub::EventType;
use twitch_api::twitch_oauth2::{AccessToken, UserToken};

use crate::error::Error;
use crate::{AppState, HTTP};

#[derive(Debug, Deserialize)]
pub struct Response<T> {
    pub data: T,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
}

pub async fn refresh_access_token(
    helix: &HelixClient<'static, reqwest::Client>,
) -> Result<UserToken, Error> {
    let refresh_token = Entry::new("com.hyperion.chat", "refresh-token")?.get_password()?;

    let tokens = HTTP
        .post("https://usehyperion.app/api/auth/twitch/refresh")
        .json(&json!({ "refresh_token": refresh_token }))
        .send()
        .await?
        .error_for_status()?
        .json::<TokenResponse>()
        .await?;

    Entry::new("com.hyperion.chat", "access-token")?.set_password(&tokens.access_token)?;
    Entry::new("com.hyperion.chat", "refresh-token")?.set_password(&tokens.refresh_token)?;

    UserToken::from_token(helix, AccessToken::new(tokens.access_token))
        .await
        .map_err(|err| Error::Generic(anyhow!("Failed to validate refreshed token: {err}")))
}

pub fn get_access_token(state: &AppState) -> Result<&UserToken, Error> {
    state.token.as_ref().ok_or_else(|| {
        tracing::error!("Attempted to retrieve access token but no token is set");
        Error::Generic(anyhow!("Access token not set"))
    })
}

#[tauri::command]
pub async fn store_tokens(
    state: State<'_, Mutex<AppState>>,
    access_token: String,
    refresh_token: String,
) -> Result<(), Error> {
    let mut state = state.lock().await;

    let at_entry = Entry::new("com.hyperion.chat", "access-token")?;
    at_entry.set_password(&access_token)?;

    let rt_entry = Entry::new("com.hyperion.chat", "refresh-token")?;
    rt_entry.set_password(&refresh_token)?;

    state.token = UserToken::from_token(&state.helix, AccessToken::new(access_token))
        .await
        .ok();

    Ok(())
}

#[tauri::command]
pub async fn get_token(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, Error> {
    let state = state.lock().await;

    Ok(state
        .token
        .as_ref()
        .map(|token| token.access_token.as_str().to_string()))
}

#[tauri::command]
pub async fn refresh_token(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, Error> {
    let mut state = state.lock().await;

    let token = refresh_access_token(&state.helix).await?;
    let access_token = token.access_token.as_str().to_string();
    state.token = Some(token);

    tracing::info!("Refreshed access token");

    Ok(Some(access_token))
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

    let (token, irc, eventsub, seventv, pubsub) = {
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
            state.pubsub.clone(),
        )
    };

    let login_clone = login.clone();

    async_runtime::spawn(
        async move {
            if let Some(eventsub) = eventsub {
                let ch_cond = json!({
                    "broadcaster_user_id": id
                });

                let ch_with_user_cond = json!({
                    "broadcaster_user_id": id,
                    "user_id": token.user_id
                });

                let ch_with_mod_cond = json!({
                    "broadcaster_user_id": id,
                    "moderator_user_id": token.user_id
                });

                use EventType as Ev;

                let base_events = [
                    (Ev::ChannelChatUserMessageHold, &ch_with_user_cond),
                    (Ev::ChannelChatUserMessageUpdate, &ch_with_user_cond),
                    (Ev::ChannelSubscriptionEnd, &ch_cond),
                    (Ev::ChannelUpdate, &ch_cond),
                    (Ev::StreamOffline, &ch_cond),
                    (Ev::StreamOnline, &ch_cond),
                ];

                let mod_events = [
                    (Ev::AutomodMessageHold, &ch_with_mod_cond),
                    (Ev::AutomodMessageUpdate, &ch_with_mod_cond),
                    (Ev::ChannelModerate, &ch_with_mod_cond),
                    (Ev::ChannelSuspiciousUserMessage, &ch_with_mod_cond),
                    (Ev::ChannelSuspiciousUserUpdate, &ch_with_mod_cond),
                    (Ev::ChannelUnbanRequestCreate, &ch_with_mod_cond),
                    (Ev::ChannelUnbanRequestResolve, &ch_with_mod_cond),
                    (Ev::ChannelWarningAcknowledge, &ch_with_mod_cond),
                ];

                let events: Vec<_> = base_events
                    .iter()
                    .chain(mod_events.iter().filter(|_| is_mod))
                    .copied()
                    .collect();

                if let Err(err) = eventsub.subscribe_all(login_clone.as_str(), &events).await {
                    tracing::error!(%err, "Failed to batch subscribe to EventSub events");
                }
            }

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
                let topics = vec![
                    format!("community-points-channel-v1.{id}"),
                    format!("pinned-chat-updates-v1.{id}"),
                    format!("predictions-channel-v1.{id}"),
                    format!("polls.{id}"),
                ];

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

    if let Some(ref eventsub) = state.eventsub {
        eventsub.unsubscribe_all(&channel).await?;
    }

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

    let (eventsub, pubsub, irc) = {
        let state = state.lock().await;

        (
            state.eventsub.clone(),
            state.pubsub.clone(),
            state.irc.clone(),
        )
    };

    if let Some(eventsub) = eventsub {
        let subscriptions = eventsub.unsubscribe_all(&channel).await?;
        let subs_ref: Vec<_> = subscriptions.iter().map(|(e, c)| (*e, c)).collect();

        eventsub.subscribe_all(&channel, &subs_ref).await?;
    }

    if let Some(pubsub) = pubsub {
        pubsub.relisten(&channel).await;
    }

    if let Some(irc) = irc {
        irc.join(channel);
    }

    Ok(())
}
