use crate::models::{Jobs, LLMSettings};
use crate::utils::settings::{read_json_file_with_default, write_json_file};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_llm_settings(app: AppHandle) -> Result<LLMSettings, String> {
    let config_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    let settings_path = config_dir.join("llm.json");
    read_json_file_with_default(
        &settings_path,
        LLMSettings {
            providers: vec![],
            jobs: Jobs {
                metadataExtraction: String::new(),
                imageTextExtraction: String::new(),
            },
        },
    )
}

#[tauri::command]
pub fn set_llm_settings(app: AppHandle, settings: LLMSettings) -> Result<(), String> {
    if !settings.jobs.metadataExtraction.is_empty()
        && !settings
            .providers
            .iter()
            .any(|p| p.name == settings.jobs.metadataExtraction)
    {
        return Err("Invalid metadata extraction provider".to_string());
    }
    if !settings.jobs.imageTextExtraction.is_empty()
        && !settings
            .providers
            .iter()
            .any(|p| p.name == settings.jobs.imageTextExtraction)
    {
        return Err("Invalid image text extraction provider".to_string());
    }

    let config_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    let settings_path = config_dir.join("llm.json");
    write_json_file(&settings_path, &settings)
}

#[tauri::command]
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
