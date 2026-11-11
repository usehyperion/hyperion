use std::io::ErrorKind;
use std::path::PathBuf;

use serde::Deserialize;
use tauri::{AppHandle, Manager};

use crate::error::Error;

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LegacyStore {
    Settings,
    Storage,
}

impl LegacyStore {
    fn path(self, app: &AppHandle) -> Result<PathBuf, Error> {
        let name = match self {
            Self::Settings => "settings",
            Self::Storage => "storage",
        };

        let file = if cfg!(debug_assertions) {
            format!("{name}.dev.json")
        } else {
            format!("{name}.json")
        };

        Ok(app.path().app_data_dir()?.join(file))
    }
}

#[tauri::command]
#[tracing::instrument(skip(app))]
pub fn read_legacy_store(app: AppHandle, store: LegacyStore) -> Result<Option<String>, Error> {
    match std::fs::read_to_string(store.path(&app)?) {
        Ok(contents) => Ok(Some(contents)),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(None),
        Err(err) => Err(anyhow::Error::from(err).into()),
    }
}

#[tauri::command]
#[tracing::instrument(skip(app))]
pub fn remove_legacy_store(app: AppHandle, store: LegacyStore) -> Result<(), Error> {
    match std::fs::remove_file(store.path(&app)?) {
        Err(err) if err.kind() != ErrorKind::NotFound => Err(anyhow::Error::from(err).into()),
        _ => Ok(()),
    }
}
