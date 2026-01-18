use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone)]
struct LLMProvider {
    name: String,
    #[serde(rename = "type")]
    r#type: String,
    model: String,
    baseURL: String,
    apiKey: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Jobs {
    metadataExtraction: String,
    imageTextExtraction: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct LLMSettings {
    providers: Vec<LLMProvider>,
    jobs: Jobs,
}

#[tauri::command]
fn get_llm_settings() -> Result<LLMSettings, String> {
    let settings_path = Path::new("settings").join("llm.json");
    match fs::read_to_string(&settings_path) {
        Ok(data) => match serde_json::from_str(&data) {
            Ok(settings) => Ok(settings),
            Err(e) => Err(format!("Failed to parse settings: {}", e)),
        },
        Err(_) => Ok(LLMSettings {
            providers: vec![],
            jobs: Jobs {
                metadataExtraction: String::new(),
                imageTextExtraction: String::new(),
            },
        }),
    }
}

#[tauri::command]
fn set_llm_settings(settings: LLMSettings) -> Result<(), String> {
    // Validate
    if !settings.jobs.metadataExtraction.is_empty()
        && !settings.providers.iter().any(|p| p.name == settings.jobs.metadataExtraction)
    {
        return Err("Invalid metadata extraction provider".to_string());
    }
    if !settings.jobs.imageTextExtraction.is_empty()
        && !settings.providers.iter().any(|p| p.name == settings.jobs.imageTextExtraction)
    {
        return Err("Invalid image text extraction provider".to_string());
    }

    let settings_path = Path::new("settings").join("llm.json");
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_llm_settings, set_llm_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
