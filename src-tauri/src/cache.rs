use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{Connection, OptionalExtension, params};
use serde_json::Value;
use tauri::{State, async_runtime};

use crate::error::Error;

const ZSTD_LEVEL: i32 = 3;

#[derive(Clone)]
pub struct Cache(Arc<Mutex<Connection>>);

impl Cache {
    pub fn open(path: &Path) -> Self {
        match Self::init(Connection::open(path)) {
            Ok(cache) => return cache,
            Err(error) => tracing::warn!(%error, "Failed to open cache, recreating it"),
        }

        for suffix in ["", "-wal", "-shm"] {
            let mut file = path.as_os_str().to_owned();
            file.push(suffix);

            let _ = fs::remove_file(file);
        }

        match Self::init(Connection::open(path)) {
            Ok(cache) => cache,
            Err(error) => {
                tracing::error!(%error, "Failed to recreate cache, falling back to memory");

                Self::init(Connection::open_in_memory()).expect("failed to open in-memory cache")
            }
        }
    }

    fn init(conn: rusqlite::Result<Connection>) -> rusqlite::Result<Self> {
        let conn = conn?;

        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value BLOB NOT NULL,
                expires_at INTEGER
            );",
        )?;

        // Expired rows are filtered out on read, so purging once per launch is
        // enough to keep the file from growing.
        conn.execute("DELETE FROM cache WHERE expires_at <= ?1", [now()])?;

        Ok(Self(Arc::new(Mutex::new(conn))))
    }

    fn get(&self, key: &str) -> Result<Option<Value>, Error> {
        let blob: Option<Vec<u8>> = self
            .0
            .lock()
            .unwrap()
            .query_row(
                "SELECT value FROM cache WHERE key = ?1 AND (expires_at IS NULL OR expires_at > ?2)",
                params![key, now()],
                |row| row.get(0),
            )
            .optional()?;

        let Some(blob) = blob else {
            return Ok(None);
        };

        let json = zstd::decode_all(blob.as_slice())?;

        Ok(Some(serde_json::from_slice(&json)?))
    }

    fn set(&self, key: &str, value: &Value, ttl: Option<u64>) -> Result<(), Error> {
        let json = serde_json::to_vec(value)?;
        let blob = zstd::encode_all(json.as_slice(), ZSTD_LEVEL)?;
        let expires_at = ttl.map(|ttl| now() + ttl as i64);

        self.0.lock().unwrap().execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?1, ?2, ?3)",
            params![key, blob, expires_at],
        )?;

        Ok(())
    }

    fn remove(&self, key: &str) -> Result<(), Error> {
        self.0
            .lock()
            .unwrap()
            .execute("DELETE FROM cache WHERE key = ?1", [key])?;

        Ok(())
    }

    fn clear(&self) -> Result<(), Error> {
        self.0
            .lock()
            .unwrap()
            .execute_batch("DELETE FROM cache; VACUUM; PRAGMA wal_checkpoint(TRUNCATE);")?;

        Ok(())
    }

    fn size(&self) -> Result<i64, Error> {
        let size = self.0.lock().unwrap().query_row(
            "SELECT COALESCE(SUM(LENGTH(key) + LENGTH(value)), 0) FROM cache",
            [],
            |row| row.get(0),
        )?;

        Ok(size)
    }
}

fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

async fn blocking<T, F>(cache: &Cache, f: F) -> Result<T, Error>
where
    T: Send + 'static,
    F: FnOnce(&Cache) -> Result<T, Error> + Send + 'static,
{
    let cache = cache.clone();

    async_runtime::spawn_blocking(move || f(&cache))
        .await
        .map_err(anyhow::Error::from)?
}

#[tauri::command]
pub async fn cache_get(cache: State<'_, Cache>, key: String) -> Result<Option<Value>, Error> {
    blocking(&cache, move |cache| cache.get(&key)).await
}

#[tauri::command]
pub async fn cache_set(
    cache: State<'_, Cache>,
    key: String,
    value: Value,
    ttl: Option<u64>,
) -> Result<(), Error> {
    blocking(&cache, move |cache| cache.set(&key, &value, ttl)).await
}

#[tauri::command]
pub async fn cache_remove(cache: State<'_, Cache>, key: String) -> Result<(), Error> {
    blocking(&cache, move |cache| cache.remove(&key)).await
}

#[tauri::command]
pub async fn cache_clear(cache: State<'_, Cache>) -> Result<(), Error> {
    blocking(&cache, Cache::clear).await
}

#[tauri::command]
pub async fn cache_size(cache: State<'_, Cache>) -> Result<i64, Error> {
    blocking(&cache, Cache::size).await
}
