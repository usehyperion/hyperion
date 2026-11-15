mod client;

pub use client::PubSubClient;
use client::PubSubMessage;
use tauri::AppHandle;
use tauri::ipc::Channel;

use crate::AppState;
use crate::auth::connection_token;
use crate::connection::{self, Client, Connection};
use crate::error::Error;

enum Scope {
    /// `{name}.{channel_id}`
    Channel,
    /// `{name}.{user_id}.{channel_id}` for the current user in a channel.
    UserInChannel,
    ModeratorInChannel,
    /// `{name}.{user_id}`, listened to for the whole session.
    User,
}

const TOPICS: &[(&str, Scope)] = &[
    ("broadcast-settings-update", Scope::Channel),
    ("community-points-channel-v1", Scope::Channel),
    ("pinned-chat-updates-v1", Scope::Channel),
    ("predictions-channel-v1", Scope::Channel),
    ("polls", Scope::Channel),
    ("raid", Scope::Channel),
    ("video-playback-by-id", Scope::Channel),
    ("user-moderation-notifications", Scope::UserInChannel),
    ("automod-queue", Scope::ModeratorInChannel),
    ("channel-unban-requests", Scope::ModeratorInChannel),
    ("chat_moderator_actions", Scope::ModeratorInChannel),
    ("low-trust-users", Scope::ModeratorInChannel),
    ("whispers", Scope::User),
];

fn channel_topics(user_id: Option<&str>, channel_id: &str, is_mod: bool) -> Vec<String> {
    TOPICS
        .iter()
        .filter_map(|(name, scope)| match (scope, user_id) {
            (Scope::Channel, _) => Some(format!("{name}.{channel_id}")),
            (Scope::UserInChannel, Some(user_id)) => Some(format!("{name}.{user_id}.{channel_id}")),
            (Scope::ModeratorInChannel, Some(user_id)) if is_mod => {
                Some(format!("{name}.{user_id}.{channel_id}"))
            }
            _ => None,
        })
        .collect()
}

fn user_topics(user_id: &str) -> Vec<String> {
    TOPICS
        .iter()
        .filter(|(_, scope)| matches!(scope, Scope::User))
        .map(|(name, _)| format!("{name}.{user_id}"))
        .collect()
}

impl Client for PubSubClient {
    type Message = PubSubMessage;

    const NAME: &'static str = "PubSub";

    fn slot(state: &mut AppState) -> &mut Option<Connection<Self>> {
        &mut state.pubsub
    }
}

#[tauri::command]
pub async fn connect_pubsub(
    app_handle: AppHandle,
    channel: Channel<PubSubMessage>,
    anonymous: bool,
) -> Result<(), Error> {
    connection::connect(app_handle, channel, |state| {
        let token = connection_token(state, anonymous)?.cloned();

        Ok(PubSubClient::start(token))
    })
    .await
}
