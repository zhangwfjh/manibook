use crate::config::llm::{
    get_llm_settings as config_get_llm_settings, import_llm_settings as config_import_llm_settings,
    set_llm_settings as config_set_llm_settings,
};
use crate::models::llm::LLMSettings;
use tauri::AppHandle;

#[tauri::command]
pub fn get_llm_settings(app: AppHandle) -> Result<LLMSettings, String> {
    log::debug!("Fetching LLM settings");

    let settings = config_get_llm_settings(app)?;
    let provider_count = settings.providers.len();
    log::debug!("Loaded LLM settings with {} providers", provider_count);
    Ok(settings)
}

#[tauri::command]
pub fn set_llm_settings(app: AppHandle, settings: LLMSettings) -> Result<(), String> {
    let provider_count = settings.providers.len();
    log::info!("Saving LLM settings with {} providers", provider_count);

    config_set_llm_settings(app, settings)?;
    log::info!("Successfully saved LLM settings");
    Ok(())
}

#[tauri::command]
pub fn import_llm_settings(app: AppHandle, file_path: String) -> Result<(), String> {
    log::info!("Importing LLM settings from: {}", file_path);

    config_import_llm_settings(app, file_path.clone())?;
    log::info!("Successfully imported LLM settings from: {}", file_path);
    Ok(())
}
