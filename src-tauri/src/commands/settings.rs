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
    log::debug!(
        "Loaded LLM settings with {} API keys",
        settings.api_keys.len()
    );
    Ok(settings)
}

#[tauri::command]
pub fn set_llm_settings(app: AppHandle, settings: LLMSettings) -> Result<(), String> {
    log::info!(
        "Saving LLM settings with {} API keys",
        settings.api_keys.len()
    );

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
