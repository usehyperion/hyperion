use std::collections::BTreeMap;

use tauri_plugin_svelte::{Marshaler, MarshalingError, StoreState};

pub struct JsonMarshaler;

impl Marshaler for JsonMarshaler {
    fn serialize(&self, state: &StoreState) -> Result<Vec<u8>, MarshalingError> {
        let ordered: BTreeMap<_, _> = state.entries().collect();
        Ok(serde_json::to_vec_pretty(&ordered)?)
    }

    fn deserialize(&self, bytes: &[u8]) -> Result<StoreState, MarshalingError> {
        Ok(serde_json::from_slice(bytes)?)
    }

    fn extension(&self) -> &'static str {
        "json"
    }
}
