use crate::models::llm::LLMSettings;
use crate::utils::settings::{read_json_file_with_default, write_json_file};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

pub fn get_llm_settings(app: AppHandle) -> Result<LLMSettings, String> {
    let config_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?
        .join("config");
    let settings_path = config_dir.join("llm.json");
    read_json_file_with_default(&settings_path, LLMSettings::default())
}

pub fn set_llm_settings(app: AppHandle, settings: LLMSettings) -> Result<(), String> {
    if !settings.jobs.metadata_extraction.is_empty() {
        if let Some(provider_id) = settings.jobs.metadata_extraction.split('/').next() {
            if !settings.api_keys.contains_key(provider_id) {
                return Err(format!(
                    "API key not configured for provider '{}' (required by metadata extraction model)",
                    provider_id
                ));
            }
        }
    }

    if !settings.jobs.image_text_extraction.is_empty() {
        if let Some(provider_id) = settings.jobs.image_text_extraction.split('/').next() {
            if !settings.api_keys.contains_key(provider_id) {
                return Err(format!(
                    "API key not configured for provider '{}' (required by image text extraction model)",
                    provider_id
                ));
            }
        }
    }

    let config_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?
        .join("config");
    let settings_path = config_dir.join("llm.json");
    write_json_file(&settings_path, &settings)
}

pub fn import_llm_settings(app: AppHandle, file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let data = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let settings: LLMSettings =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    set_llm_settings(app, settings)
}
