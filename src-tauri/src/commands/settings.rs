use crate::config::llm::{
    get_llm_settings as config_get_llm_settings, import_llm_settings as config_import_llm_settings,
    set_llm_settings as config_set_llm_settings,
};
use crate::models::llm::LLMSettings;
use tauri::AppHandle;

#[tauri::command]
pub fn get_llm_settings(app: AppHandle) -> Result<LLMSettings, String> {
    config_get_llm_settings(app)
}

#[tauri::command]
pub fn set_llm_settings(app: AppHandle, settings: LLMSettings) -> Result<(), String> {
    config_set_llm_settings(app, settings)
}

#[tauri::command]
pub fn import_llm_settings(app: AppHandle, file_path: String) -> Result<(), String> {
    config_import_llm_settings(app, file_path)
}
