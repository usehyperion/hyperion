// Parse errors carry the offending message so it can be logged.
#![allow(clippy::result_large_err)]

use std::str::FromStr;

use ServerMessageParseError::*;
use serde::Serialize;
use thiserror::Error;

use super::prefix::IrcPrefix;
use super::{Badge, BasicUser, Emote, Gif, IrcMessage, Reply, ReplyParent, ReplyThread, Source};

/// Twitch's AnAnonymousGifter account.
const ANONYMOUS_GIFTER_ID: &str = "274598607";

/// The tags a user's id, login, and display name are read from.
struct UserTags {
    id: &'static str,
    login: &'static str,
    name: &'static str,
}

const SENDER: UserTags = UserTags {
    id: "user-id",
    login: "login",
    name: "display-name",
};

const RECIPIENT: UserTags = UserTags {
    id: "msg-param-recipient-id",
    login: "msg-param-recipient-user-name",
    name: "msg-param-recipient-display-name",
};

const PRIOR_GIFTER: UserTags = UserTags {
    id: "msg-param-prior-gifter-id",
    login: "msg-param-prior-gifter-user-name",
    name: "msg-param-prior-gifter-display-name",
};

const REPLY_PARENT: UserTags = UserTags {
    id: "reply-parent-user-id",
    login: "reply-parent-user-login",
    name: "reply-parent-display-name",
};

const REPLY_THREAD: UserTags = UserTags {
    id: "reply-thread-parent-user-id",
    login: "reply-thread-parent-user-login",
    name: "reply-thread-parent-display-name",
};

#[derive(Debug, Clone, Serialize)]
pub struct ClearChatMessage {
    pub channel_login: String,
    pub channel_id: String,
    pub action: ClearChatAction,
    pub is_recent: bool,
    pub server_timestamp: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type")]
pub enum ClearChatAction {
    #[serde(rename = "clear")]
    ChatClear,
    #[serde(rename = "ban")]
    UserBan { user_login: String, user_id: String },
    #[serde(rename = "timeout")]
    UserTimeout {
        user_login: String,
        user_id: String,
        /// In seconds.
        duration: u64,
    },
}

impl TryFrom<IrcMessage> for ClearChatMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<ClearChatMessage, ServerMessageParseError> {
        if raw.command != "CLEARCHAT" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        let action = match raw.params.get(1) {
            Some(user_login) => {
                let user_login = user_login.to_owned();
                let user_id = raw.try_get_nonempty_tag_value("target-user-id")?.to_owned();

                match raw.try_get_optional_number("ban-duration")? {
                    Some(duration) => ClearChatAction::UserTimeout {
                        user_login,
                        user_id,
                        duration,
                    },
                    None => ClearChatAction::UserBan {
                        user_login,
                        user_id,
                    },
                }
            }
            None => ClearChatAction::ChatClear,
        };

        Ok(ClearChatMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            channel_id: raw.try_get_nonempty_tag_value("room-id")?.to_owned(),
            action,
            is_recent: raw.try_get_optional_bool("historical")?.unwrap_or_default(),
            server_timestamp: raw.try_get_number("tmi-sent-ts")?,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ClearMsgMessage {
    pub channel_login: String,
    pub channel_id: String,
    pub sender_login: String,
    pub message_id: String,
    pub message_text: String,
    pub is_action: bool,
    pub is_recent: bool,
    pub server_timestamp: u64,
}

impl TryFrom<IrcMessage> for ClearMsgMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<ClearMsgMessage, ServerMessageParseError> {
        if raw.command != "CLEARMSG" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        let (message_text, is_action) = raw.try_get_message_text()?;

        Ok(ClearMsgMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            channel_id: raw.try_get_nonempty_tag_value("room-id")?.to_owned(),
            sender_login: raw.try_get_nonempty_tag_value("login")?.to_owned(),
            message_id: raw.try_get_nonempty_tag_value("target-msg-id")?.to_owned(),
            server_timestamp: raw.try_get_number("tmi-sent-ts")?,
            message_text: message_text.to_owned(),
            is_action,
            is_recent: raw.try_get_optional_bool("historical")?.unwrap_or_default(),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct JoinMessage {
    pub channel_login: String,
    pub user_login: String,
}

impl TryFrom<IrcMessage> for JoinMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<JoinMessage, ServerMessageParseError> {
        if raw.command != "JOIN" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        Ok(JoinMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            user_login: raw.try_get_prefix_nickname()?.to_owned(),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct NoticeMessage {
    pub channel_login: Option<String>,
    pub message_text: String,
    pub message_id: Option<String>,
    pub deleted: bool,
    pub is_recent: bool,
    pub recent_timestamp: Option<u64>,
}

impl TryFrom<IrcMessage> for NoticeMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<NoticeMessage, ServerMessageParseError> {
        if raw.command != "NOTICE" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        Ok(NoticeMessage {
            channel_login: raw.try_get_optional_channel_login()?.map(|s| s.to_owned()),
            message_text: raw.try_get_param(1)?.to_owned(),
            message_id: raw
                .try_get_optional_nonempty_tag_value("msg-id")?
                .map(|s| s.to_owned()),
            deleted: raw.try_get_optional_bool("rm-deleted")?.unwrap_or_default(),
            is_recent: raw.try_get_optional_bool("historical")?.unwrap_or_default(),
            recent_timestamp: raw.try_get_optional_number("rm-received-ts").ok().flatten(),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PartMessage {
    pub channel_login: String,
    pub user_login: String,
}

impl TryFrom<IrcMessage> for PartMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<PartMessage, ServerMessageParseError> {
        if raw.command != "PART" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        Ok(PartMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            user_login: raw.try_get_prefix_nickname()?.to_owned(),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct PrivmsgMessage {
    pub channel_login: String,
    pub channel_id: String,
    pub message_text: String,
    pub reply: Option<Reply>,
    pub is_action: bool,
    pub is_first_msg: bool,
    pub is_returning_chatter: bool,
    pub is_highlighted: bool,
    pub is_mod: bool,
    pub is_subscriber: bool,
    pub custom_reward_id: Option<String>,
    pub sender: BasicUser,
    pub badge_info: Vec<Badge>,
    pub badges: Vec<Badge>,
    pub bits: Option<u64>,
    /// `None` when the user hasn't picked a color.
    pub name_color: Option<String>,
    pub emotes: Vec<Emote>,
    pub gif: Option<Gif>,
    pub message_id: String,
    pub deleted: bool,
    pub is_recent: bool,
    pub source_only: Option<bool>,
    pub source: Option<Source>,
    pub server_timestamp: u64,
}

impl TryFrom<IrcMessage> for PrivmsgMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<PrivmsgMessage, ServerMessageParseError> {
        if raw.command != "PRIVMSG" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        let (message_text, is_action) = raw.try_get_message_text()?;

        let msg_id = raw.get_optional_nonempty_tag_value("msg-id");

        Ok(PrivmsgMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            channel_id: raw.try_get_nonempty_tag_value("room-id")?.to_owned(),
            sender: BasicUser {
                id: raw.try_get_nonempty_tag_value("user-id")?.to_owned(),
                login: raw.try_get_prefix_nickname()?.to_owned(),
                name: raw.try_get_nonempty_tag_value("display-name")?.to_owned(),
            },
            badge_info: raw.try_get_badges("badge-info")?,
            badges: raw.try_get_badges("badges")?,
            bits: raw.try_get_optional_number("bits")?,
            name_color: raw.try_get_optional_color()?,
            emotes: raw.try_get_emotes("emotes", message_text)?,
            gif: raw.try_get_optional_gif("gifs")?,
            server_timestamp: raw.try_get_number("tmi-sent-ts")?,
            message_id: raw.try_get_nonempty_tag_value("id")?.to_owned(),
            message_text: message_text.to_owned(),
            reply: raw.try_get_optional_reply()?,
            is_action,
            is_first_msg: raw.try_get_bool("first-msg").unwrap_or_default(),
            is_returning_chatter: raw.try_get_bool("returning-chatter").unwrap_or_default(),
            is_highlighted: msg_id
                .map(|id| id == "highlighted-message")
                .unwrap_or_default(),
            is_mod: raw.try_get_bool("mod")?,
            is_subscriber: raw.try_get_bool("subscriber")?,
            custom_reward_id: raw
                .get_optional_nonempty_tag_value("custom-reward-id")
                .map(|s| s.to_owned()),
            deleted: raw.try_get_optional_bool("rm-deleted")?.unwrap_or_default(),
            is_recent: raw.try_get_optional_bool("historical")?.unwrap_or_default(),
            source_only: raw.try_get_optional_bool("source-only").ok().flatten(),
            source: raw.try_get_source()?,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct RoomStateMessage {
    pub channel_login: String,
    pub channel_id: String,
    pub emote_only: Option<bool>,
    pub followers_only: Option<i64>,
    pub unique_mode: Option<bool>,
    pub slow_mode: Option<u64>,
    pub subscribers_only: Option<bool>,
    pub is_recent: bool,
}

impl TryFrom<IrcMessage> for RoomStateMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<RoomStateMessage, ServerMessageParseError> {
        if raw.command != "ROOMSTATE" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        Ok(RoomStateMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            channel_id: raw.try_get_nonempty_tag_value("room-id")?.to_owned(),
            emote_only: raw.try_get_optional_bool("emote-only")?,
            followers_only: raw.try_get_optional_number::<i64>("followers-only")?,
            unique_mode: raw.try_get_optional_bool("r9k")?,
            slow_mode: raw.try_get_optional_number::<u64>("slow")?,
            subscribers_only: raw.try_get_optional_bool("subs-only")?,
            is_recent: raw.try_get_optional_bool("historical")?.unwrap_or_default(),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct UserNoticeMessage {
    pub channel_login: String,
    pub channel_id: String,
    pub sender: BasicUser,
    pub message_text: Option<String>,
    pub system_message: String,
    pub event: UserNoticeEvent,
    pub event_id: String,
    pub badge_info: Vec<Badge>,
    pub badges: Vec<Badge>,
    pub emotes: Vec<Emote>,
    /// `None` when the user hasn't picked a color.
    pub name_color: Option<String>,
    pub message_id: String,
    pub deleted: bool,
    pub is_recent: bool,
    pub source_only: Option<bool>,
    pub source: Option<Source>,
    pub server_timestamp: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SubGiftPromo {
    pub total_gifts: u64,
    pub promo_name: String,
}

impl SubGiftPromo {
    fn parse_if_present(raw: &IrcMessage) -> Result<Option<SubGiftPromo>, ServerMessageParseError> {
        if let (Some(total_gifts), Some(promo_name)) = (
            raw.try_get_optional_number("msg-param-promo-gift-total")?,
            raw.try_get_optional_nonempty_tag_value("msg-param-promo-name")?
                .map(|s| s.to_owned()),
        ) {
            Ok(Some(SubGiftPromo {
                total_gifts,
                promo_name,
            }))
        } else {
            Ok(None)
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum UserNoticeEvent {
    Announcement {
        color: String,
    },
    StandardPayForward {
        is_prior_gifter_anonymous: bool,
        prior_gifter: BasicUser,
        recipient: BasicUser,
    },
    CommunityPayForward {
        gifter: BasicUser,
    },
    CharityDonation {
        charity_name: String,
        donation_amount: u64,
        donation_currency: String,
        exponent: u64,
    },
    SubOrResub {
        is_resub: bool,
        cumulative_months: u64,
        streak_months: Option<u64>,
        multimonth_tenure: Option<u64>,
        multimonth_duration: Option<u64>,
        sub_plan: String,
        sub_plan_name: String,
    },
    Raid {
        viewer_count: u64,
        profile_image_url: String,
    },
    Unraid,
    SubGift {
        is_sender_anonymous: bool,
        cumulative_months: u64,
        recipient: BasicUser,
        sub_plan: String,
        sub_plan_name: String,
        num_gifted_months: u64,
        sender_total_months: u64,
    },
    SubMysteryGift {
        mass_gift_count: u64,
        sender_total_gifts: Option<u64>,
        sub_plan: String,
    },
    AnonSubMysteryGift {
        mass_gift_count: u64,
        sub_plan: String,
    },
    PrimePaidUpgrade {
        sub_plan: String,
    },
    GiftPaidUpgrade {
        gifter_login: String,
        gifter_name: String,
        promotion: Option<SubGiftPromo>,
    },
    AnonGiftPaidUpgrade {
        promotion: Option<SubGiftPromo>,
    },
    Ritual {
        ritual_name: String,
    },
    BitsBadgeTier {
        threshold: u64,
    },
    OneTapGiftRedeemed {
        bits: u32,
        gift_id: String,
    },
    WatchStreak {
        streak: u32,
        points: u32,
    },
    Unknown,
}

impl TryFrom<IrcMessage> for UserNoticeMessage {
    type Error = ServerMessageParseError;

    fn try_from(raw: IrcMessage) -> Result<UserNoticeMessage, ServerMessageParseError> {
        if raw.command != "USERNOTICE" {
            return Err(ServerMessageParseError::MismatchedCommand(raw));
        }

        let sender = raw.try_get_user(&SENDER)?;

        let msg_id = raw.try_get_nonempty_tag_value("msg-id")?;

        let event_id = if msg_id == "sharedchatnotice" {
            raw.try_get_nonempty_tag_value("source-msg-id")?
        } else {
            msg_id
        };

        let event = match event_id {
            "announcement" => UserNoticeEvent::Announcement {
                color: raw
                    .try_get_nonempty_tag_value("msg-param-color")?
                    .to_owned(),
            },
            "standardpayforward" => UserNoticeEvent::StandardPayForward {
                is_prior_gifter_anonymous: raw.try_get_bool("msg-param-prior-gifter-anonymous")?,
                prior_gifter: raw.try_get_user(&PRIOR_GIFTER)?,
                recipient: raw.try_get_user(&RECIPIENT)?,
            },
            "communitypayforward" => UserNoticeEvent::CommunityPayForward {
                gifter: raw.try_get_user(&PRIOR_GIFTER)?,
            },
            "charitydonation" => UserNoticeEvent::CharityDonation {
                charity_name: raw
                    .try_get_nonempty_tag_value("msg-param-charity-name")?
                    .to_owned(),
                donation_amount: raw.try_get_number("msg-param-donation-amount")?,
                donation_currency: raw
                    .try_get_nonempty_tag_value("msg-param-donation-currency")?
                    .to_owned(),
                exponent: raw.try_get_number("msg-param-exponent")?,
            },
            "sub" | "resub" => UserNoticeEvent::SubOrResub {
                is_resub: event_id == "resub",
                cumulative_months: raw.try_get_number("msg-param-cumulative-months")?,
                streak_months: if raw.try_get_bool("msg-param-should-share-streak")? {
                    Some(raw.try_get_number("msg-param-streak-months")?)
                } else {
                    None
                },
                multimonth_tenure: raw.try_get_optional_number("msg-param-multimonth-tenure")?,
                multimonth_duration: raw
                    .try_get_optional_number("msg-param-multimonth-duration")?,
                sub_plan: raw
                    .try_get_nonempty_tag_value("msg-param-sub-plan")?
                    .to_owned(),
                sub_plan_name: raw
                    .try_get_nonempty_tag_value("msg-param-sub-plan-name")?
                    .to_owned(),
            },
            "raid" => UserNoticeEvent::Raid {
                viewer_count: raw.try_get_number::<u64>("msg-param-viewerCount")?,
                profile_image_url: raw
                    .try_get_nonempty_tag_value("msg-param-profileImageURL")?
                    .to_owned(),
            },
            "unraid" => UserNoticeEvent::Unraid,
            "subgift" | "anonsubgift" => UserNoticeEvent::SubGift {
                is_sender_anonymous: event_id == "anonsubgift" || sender.id == ANONYMOUS_GIFTER_ID,
                cumulative_months: raw.try_get_number("msg-param-months")?,
                recipient: raw.try_get_user(&RECIPIENT)?,
                sub_plan: raw
                    .try_get_nonempty_tag_value("msg-param-sub-plan")?
                    .to_owned(),
                sub_plan_name: raw
                    .try_get_nonempty_tag_value("msg-param-sub-plan-name")?
                    .to_owned(),
                num_gifted_months: raw.try_get_number("msg-param-gift-months")?,
                sender_total_months: raw
                    .try_get_optional_number("msg-param-sender-count")?
                    .unwrap_or_default(),
            },
            "primepaidupgrade" => UserNoticeEvent::PrimePaidUpgrade {
                sub_plan: raw
                    .try_get_nonempty_tag_value("msg-param-sub-plan")?
                    .to_owned(),
            },
            _ if (sender.id == ANONYMOUS_GIFTER_ID && event_id == "submysterygift")
                || event_id == "anonsubmysterygift" =>
            {
                UserNoticeEvent::AnonSubMysteryGift {
                    mass_gift_count: raw.try_get_number("msg-param-mass-gift-count")?,
                    sub_plan: raw
                        .try_get_nonempty_tag_value("msg-param-sub-plan")?
                        .to_owned(),
                }
            }
            "submysterygift" => UserNoticeEvent::SubMysteryGift {
                mass_gift_count: raw.try_get_number("msg-param-mass-gift-count")?,
                sender_total_gifts: if sender.login != "twitch" {
                    Some(raw.try_get_number("msg-param-sender-count")?)
                } else {
                    raw.try_get_optional_number("msg-param-sender-count")
                        .ok()
                        .flatten()
                },
                sub_plan: raw
                    .try_get_nonempty_tag_value("msg-param-sub-plan")?
                    .to_owned(),
            },
            "giftpaidupgrade" => UserNoticeEvent::GiftPaidUpgrade {
                gifter_login: raw
                    .try_get_nonempty_tag_value("msg-param-sender-login")?
                    .to_owned(),
                gifter_name: raw
                    .try_get_nonempty_tag_value("msg-param-sender-name")?
                    .to_owned(),
                promotion: SubGiftPromo::parse_if_present(&raw)?,
            },
            "anongiftpaidupgrade" => UserNoticeEvent::AnonGiftPaidUpgrade {
                promotion: SubGiftPromo::parse_if_present(&raw)?,
            },
            "ritual" => UserNoticeEvent::Ritual {
                ritual_name: raw
                    .try_get_nonempty_tag_value("msg-param-ritual-name")?
                    .to_owned(),
            },
            "bitsbadgetier" => UserNoticeEvent::BitsBadgeTier {
                threshold: raw.try_get_number::<u64>("msg-param-threshold")?,
            },
            "onetapgiftredeemed" => UserNoticeEvent::OneTapGiftRedeemed {
                bits: raw.try_get_number("msg-param-bits-spent")?,
                gift_id: raw
                    .try_get_nonempty_tag_value("msg-param-gift-id")?
                    .to_owned(),
            },
            "viewermilestone" => {
                let category = raw.try_get_nonempty_tag_value("msg-param-category")?;

                match category {
                    "watch-streak" => UserNoticeEvent::WatchStreak {
                        streak: raw.try_get_number("msg-param-value")?,
                        points: raw.try_get_number("msg-param-copoReward")?,
                    },
                    _ => UserNoticeEvent::Unknown,
                }
            }
            _ => UserNoticeEvent::Unknown,
        };

        let message_text = raw.params.get(1).cloned();

        let emotes = if let Some(message_text) = &message_text {
            raw.try_get_emotes("emotes", message_text)?
        } else {
            vec![]
        };

        let system_message = raw
            .try_get_nonempty_tag_value("system-msg")
            .or_else(|e| {
                if event_id == "announcement" {
                    raw.try_get_param(1)
                } else {
                    Err(e)
                }
            })?
            .to_owned();

        Ok(UserNoticeMessage {
            channel_login: raw.try_get_channel_login()?.to_owned(),
            channel_id: raw.try_get_nonempty_tag_value("room-id")?.to_owned(),
            sender,
            message_text,
            system_message,
            event,
            event_id: event_id.to_owned(),
            badge_info: raw.try_get_badges("badge-info")?,
            badges: raw.try_get_badges("badges")?,
            emotes,
            name_color: raw.try_get_optional_color()?,
            message_id: raw.try_get_nonempty_tag_value("id")?.to_owned(),
            deleted: raw.try_get_optional_bool("rm-deleted")?.unwrap_or_default(),
            is_recent: raw.try_get_optional_bool("historical")?.unwrap_or_default(),
            source_only: raw.try_get_optional_bool("source-only").ok().flatten(),
            source: raw.try_get_source()?,
            server_timestamp: raw.try_get_number("tmi-sent-ts")?,
        })
    }
}

#[derive(Error, Debug)]
pub enum ServerMessageParseError {
    #[error("Could not parse IRC message {} as ServerMessage: That command's data is not parsed by this implementation", .0.to_string())]
    MismatchedCommand(IrcMessage),

    #[error("Could not parse IRC message {raw} as ServerMessage: No tag present under key `{1}`", raw = .0.to_string())]
    MissingTag(IrcMessage, &'static str),

    #[error("Could not parse IRC message {raw} as ServerMessage: No tag value present under key `{1}`", raw = .0.to_string())]
    MissingTagValue(IrcMessage, &'static str),

    #[error("Could not parse IRC message {raw} as ServerMessage: Malformed tag value for tag `{1}`, value was `{2}`", raw = .0.to_string())]
    MalformedTagValue(IrcMessage, &'static str, String),

    #[error("Could not parse IRC message {raw} as ServerMessage: No parameter found at index {1}", raw = .0.to_string())]
    MissingParameter(IrcMessage, usize),

    #[error("Could not parse IRC message {raw} as ServerMessage: Malformed channel parameter (# must be present + something after it)", raw = .0.to_string())]
    MalformedChannel(IrcMessage),

    #[error("Could not parse IRC message {} as ServerMessage: Missing prefix altogether", .0.to_string())]
    MissingPrefix(IrcMessage),

    #[error("Could not parse IRC message {} as ServerMessage: No nickname found in prefix", .0.to_string())]
    MissingNickname(IrcMessage),
}

impl IrcMessage {
    fn try_get_param(&self, index: usize) -> Result<&str, ServerMessageParseError> {
        Ok(self
            .params
            .get(index)
            .ok_or_else(|| MissingParameter(self.to_owned(), index))?)
    }

    fn try_get_message_text(&self) -> Result<(&str, bool), ServerMessageParseError> {
        let mut message_text = self.try_get_param(1)?;

        let is_action =
            message_text.starts_with("\u{0001}ACTION ") && message_text.ends_with('\u{0001}');
        if is_action {
            message_text = &message_text[8..message_text.len() - 1]
        }

        Ok((message_text, is_action))
    }

    fn try_get_tag_value(&self, key: &'static str) -> Result<&str, ServerMessageParseError> {
        match self.tags.0.get(key) {
            Some(value) => Ok(value),
            None => Err(MissingTag(self.to_owned(), key)),
        }
    }

    /// The `color` tag, which is always present but empty when the user hasn't
    /// picked a color.
    fn try_get_optional_color(&self) -> Result<Option<String>, ServerMessageParseError> {
        let color = self.try_get_tag_value("color")?;

        Ok((!color.is_empty()).then(|| color.to_owned()))
    }

    fn try_get_nonempty_tag_value(
        &self,
        key: &'static str,
    ) -> Result<&str, ServerMessageParseError> {
        match self.tags.0.get(key) {
            Some(value) => match value.as_str() {
                "" => Err(MissingTagValue(self.to_owned(), key)),
                otherwise => Ok(otherwise),
            },
            None => Err(MissingTag(self.to_owned(), key)),
        }
    }

    fn try_get_optional_nonempty_tag_value(
        &self,
        key: &'static str,
    ) -> Result<Option<&str>, ServerMessageParseError> {
        match self.tags.0.get(key) {
            Some(value) => match value.as_str() {
                "" => Err(MissingTagValue(self.to_owned(), key)),
                otherwise => Ok(Some(otherwise)),
            },
            None => Ok(None),
        }
    }

    fn get_optional_nonempty_tag_value(&self, key: &'static str) -> Option<&str> {
        match self.tags.0.get(key)?.as_str() {
            "" => None,
            otherwise => Some(otherwise),
        }
    }

    fn try_get_channel_login(&self) -> Result<&str, ServerMessageParseError> {
        let param = self.try_get_param(0)?;

        if !param.starts_with('#') || param.len() < 2 {
            return Err(MalformedChannel(self.to_owned()));
        }

        Ok(&param[1..])
    }

    fn try_get_optional_channel_login(&self) -> Result<Option<&str>, ServerMessageParseError> {
        let param = self.try_get_param(0)?;

        if param == "*" {
            return Ok(None);
        }

        if !param.starts_with('#') || param.len() < 2 {
            return Err(MalformedChannel(self.to_owned()));
        }

        Ok(Some(&param[1..]))
    }

    fn try_get_prefix_nickname(&self) -> Result<&str, ServerMessageParseError> {
        match &self.prefix {
            None => Err(MissingPrefix(self.to_owned())),
            Some(IrcPrefix::HostOnly { host: _ }) => Err(MissingNickname(self.to_owned())),
            Some(IrcPrefix::Full {
                nick,
                user: _,
                host: _,
            }) => Ok(nick),
        }
    }

    fn try_get_emotes(
        &self,
        tag_key: &'static str,
        message_text: &str,
    ) -> Result<Vec<Emote>, ServerMessageParseError> {
        let tag_value = self.try_get_tag_value(tag_key)?;

        if tag_value.is_empty() {
            return Ok(vec![]);
        }

        let chars: Vec<char> = message_text.chars().collect();
        let mut emotes = Vec::new();

        let make_error = || MalformedTagValue(self.to_owned(), tag_key, tag_value.to_owned());

        for src in tag_value.split('/') {
            let (emote_id, indices_src) = src.split_once(':').ok_or_else(make_error)?;

            for range_src in indices_src.split(',') {
                let (start, end) = range_src.split_once('-').ok_or_else(make_error)?;

                let start = usize::from_str(start).map_err(|_| make_error())?;
                let end = usize::from_str(end).map_err(|_| make_error())? + 1;

                let code: String = chars.get(start..end).unwrap_or_default().iter().collect();

                emotes.push(Emote {
                    id: emote_id.to_owned(),
                    range: start..end,
                    code,
                });
            }
        }

        emotes.sort_unstable_by_key(|e| e.range.start);

        Ok(emotes)
    }

    fn try_get_optional_gif(
        &self,
        tag_key: &'static str,
    ) -> Result<Option<Gif>, ServerMessageParseError> {
        let Some(tag_value) = self.try_get_optional_nonempty_tag_value(tag_key)? else {
            return Ok(None);
        };

        let make_error = || MalformedTagValue(self.to_owned(), tag_key, tag_value.to_owned());

        let mut parts = tag_value.splitn(3, '|');

        let _offset = parts.next().ok_or_else(make_error)?;
        let id = parts.next().ok_or_else(make_error)?;
        let url = parts.next().ok_or_else(make_error)?;

        if id.is_empty() || url.is_empty() {
            return Err(make_error());
        }

        Ok(Some(Gif {
            id: id.to_owned(),
            url: url.to_owned(),
        }))
    }

    fn try_get_badges(&self, tag_key: &'static str) -> Result<Vec<Badge>, ServerMessageParseError> {
        let tag_value = self.try_get_tag_value(tag_key)?;

        if tag_value.is_empty() {
            return Ok(vec![]);
        }

        let mut badges = Vec::new();

        let make_error = || MalformedTagValue(self.to_owned(), tag_key, tag_value.to_owned());

        for src in tag_value.split(',') {
            let (name, version) = src.split_once('/').ok_or_else(make_error)?;

            badges.push(Badge {
                name: name.to_owned(),
                version: version.to_owned(),
            });
        }

        Ok(badges)
    }

    fn parse_tag_value<N: FromStr>(
        &self,
        tag_key: &'static str,
        tag_value: &str,
    ) -> Result<N, ServerMessageParseError> {
        N::from_str(tag_value)
            .map_err(|_| MalformedTagValue(self.to_owned(), tag_key, tag_value.to_owned()))
    }

    fn try_get_number<N: FromStr>(
        &self,
        tag_key: &'static str,
    ) -> Result<N, ServerMessageParseError> {
        self.parse_tag_value(tag_key, self.try_get_nonempty_tag_value(tag_key)?)
    }

    fn try_get_bool(&self, tag_key: &'static str) -> Result<bool, ServerMessageParseError> {
        Ok(self.try_get_number::<u8>(tag_key)? > 0)
    }

    fn try_get_optional_number<N: FromStr>(
        &self,
        tag_key: &'static str,
    ) -> Result<Option<N>, ServerMessageParseError> {
        self.try_get_optional_nonempty_tag_value(tag_key)?
            .map(|tag_value| self.parse_tag_value(tag_key, tag_value))
            .transpose()
    }

    fn try_get_optional_bool(
        &self,
        tag_key: &'static str,
    ) -> Result<Option<bool>, ServerMessageParseError> {
        Ok(self.try_get_optional_number::<u8>(tag_key)?.map(|n| n > 0))
    }

    fn try_get_user(&self, tags: &UserTags) -> Result<BasicUser, ServerMessageParseError> {
        Ok(BasicUser {
            id: self.try_get_nonempty_tag_value(tags.id)?.to_owned(),
            login: self.try_get_nonempty_tag_value(tags.login)?.to_owned(),
            name: self.try_get_nonempty_tag_value(tags.name)?.to_owned(),
        })
    }

    fn try_get_optional_reply(&self) -> Result<Option<Reply>, ServerMessageParseError> {
        if !self.tags.0.contains_key("reply-parent-msg-id") {
            return Ok(None);
        }

        let parent = ReplyParent {
            message_id: self.try_get_tag_value("reply-parent-msg-id")?.to_owned(),
            user: self.try_get_user(&REPLY_PARENT)?,
            message_text: self.try_get_tag_value("reply-parent-msg-body")?.to_owned(),
        };

        let thread = ReplyThread {
            message_id: self
                .try_get_tag_value("reply-thread-parent-msg-id")?
                .to_owned(),
            user: self.try_get_user(&REPLY_THREAD)?,
        };

        Ok(Some(Reply { parent, thread }))
    }

    fn try_get_source(&self) -> Result<Option<Source>, ServerMessageParseError> {
        if !self.tags.0.contains_key("source-id") {
            return Ok(None);
        }

        Ok(Some(Source {
            message_id: self.try_get_nonempty_tag_value("source-id")?.to_owned(),
            event_id: self
                .try_get_tag_value("source-msg-id")
                .ok()
                .map(|s| s.to_owned()),
            channel_id: self
                .try_get_nonempty_tag_value("source-room-id")?
                .to_owned(),
            badges: self.try_get_badges("source-badges").unwrap_or_default(),
            badge_info: self.try_get_badges("source-badge-info").unwrap_or_default(),
        }))
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ServerMessage {
    ClearChat(ClearChatMessage),
    ClearMsg(ClearMsgMessage),
    Join(JoinMessage),
    Notice(NoticeMessage),
    Part(PartMessage),
    Ping,
    Pong,
    Privmsg(PrivmsgMessage),
    Reconnect,
    RoomState(RoomStateMessage),
    UserNotice(UserNoticeMessage),
}

impl ServerMessage {
    /// Parses the message `raw` carries, or returns `None` for a command the
    /// app has no use for.
    pub fn parse(raw: IrcMessage) -> Result<Option<ServerMessage>, ServerMessageParseError> {
        use ServerMessage::*;

        Ok(Some(match raw.command.as_str() {
            "CLEARCHAT" => ClearChat(ClearChatMessage::try_from(raw)?),
            "CLEARMSG" => ClearMsg(ClearMsgMessage::try_from(raw)?),
            "JOIN" => Join(JoinMessage::try_from(raw)?),
            "NOTICE" => Notice(NoticeMessage::try_from(raw)?),
            "PART" => Part(PartMessage::try_from(raw)?),
            "PING" => Ping,
            "PONG" => Pong,
            "PRIVMSG" => Privmsg(PrivmsgMessage::try_from(raw)?),
            "RECONNECT" => Reconnect,
            "ROOMSTATE" => RoomState(RoomStateMessage::try_from(raw)?),
            "USERNOTICE" => UserNotice(UserNoticeMessage::try_from(raw)?),
            _ => return Ok(None),
        }))
    }
}
