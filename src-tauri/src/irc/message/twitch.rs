use std::ops::Range;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BasicUser {
    pub id: String,
    pub login: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Emote {
    pub id: String,
    pub range: Range<usize>,
    pub code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Gif {
    pub id: String,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Badge {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReplyParent {
    pub message_id: String,
    pub message_text: String,
    pub user: BasicUser,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReplyThread {
    pub message_id: String,
    pub user: BasicUser,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Reply {
    pub parent: ReplyParent,
    pub thread: ReplyThread,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Source {
    pub message_id: String,
    pub event_id: Option<String>,
    pub channel_id: String,
    pub badges: Vec<Badge>,
    pub badge_info: Vec<Badge>,
}
