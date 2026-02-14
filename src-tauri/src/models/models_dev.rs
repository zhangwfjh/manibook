use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Modalities {
    #[serde(default)]
    pub input: Vec<String>,
    #[serde(default)]
    pub output: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Cost {
    #[serde(default)]
    pub input: f64,
    #[serde(default)]
    pub output: f64,
    #[serde(default)]
    pub cache_read: Option<f64>,
    #[serde(default)]
    pub cache_write: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Limit {
    #[serde(default)]
    pub context: u64,
    #[serde(default)]
    pub output: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelsDevModel {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub attachment: bool,
    #[serde(default)]
    pub reasoning: bool,
    #[serde(default)]
    pub tool_call: bool,
    #[serde(default)]
    pub temperature: bool,
    #[serde(default)]
    pub modalities: Modalities,
    #[serde(default)]
    pub cost: Cost,
    #[serde(default)]
    pub limit: Limit,
    #[serde(default)]
    pub open_weights: bool,
    #[serde(default)]
    pub knowledge: Option<String>,
    #[serde(default)]
    pub release_date: Option<String>,
    #[serde(default)]
    pub last_updated: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelsDevProvider {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub api: Option<String>,
    #[serde(default)]
    pub env: Vec<String>,
    #[serde(default)]
    pub npm: Option<String>,
    #[serde(default)]
    pub doc: Option<String>,
    pub models: HashMap<String, ModelsDevModel>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelsDevData {
    pub providers: HashMap<String, ModelsDevProvider>,
}

impl ModelsDevData {
    pub fn from_json(json: &str) -> Result<Self, String> {
        let raw: HashMap<String, ModelsDevProvider> = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse models.dev JSON: {}", e))?;
        Ok(Self { providers: raw })
    }

    pub fn get_model(&self, full_id: &str) -> Option<(ModelsDevProvider, ModelsDevModel)> {
        let slash_pos = full_id.find('/')?;
        let provider_id = &full_id[..slash_pos];
        let model_id = &full_id[slash_pos + 1..];

        let provider = self.providers.get(provider_id)?;
        let model = provider.models.get(model_id)?;
        Some((provider.clone(), model.clone()))
    }

    pub fn get_model_from_providers(
        &self,
        model_id: &str,
        provider_ids: &[String],
    ) -> Option<(ModelsDevProvider, ModelsDevModel)> {
        for provider_id in provider_ids {
            if let Some(provider) = self.providers.get(provider_id) {
                if let Some(model) = provider.models.get(model_id) {
                    return Some((provider.clone(), model.clone()));
                }
            }
        }
        None
    }
}
