use serde::{Serialize, Serializer};
use tokio_tungstenite::tungstenite;
use twitch_api::helix::ClientRequestError;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Generic(#[from] anyhow::Error),

    #[error(transparent)]
    Http(#[from] reqwest::Error),

    #[error(transparent)]
    Helix(#[from] ClientRequestError<reqwest::Error>),

    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Keyring(#[from] keyring::Error),

    #[error(transparent)]
    WebSocket(#[from] tungstenite::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
