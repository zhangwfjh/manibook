use crate::config::library::{
    create_library as config_create_library, get_libraries as config_get_libraries,
    get_library_settings,
};
use crate::models::library::Library;
use crate::services::connection_manager::open_library as cm_open_library;
use tauri::AppHandle;

#[tauri::command]
pub fn get_libraries(app: AppHandle) -> Result<Vec<Library>, String> {
    config_get_libraries(app)
}

#[tauri::command]
pub fn get_library(app: AppHandle, library_name: String) -> Result<Library, String> {
    let settings = get_library_settings(&app)?;
    settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())
}

#[tauri::command]
pub fn create_library(app: AppHandle, name: String, path: String) -> Result<(), String> {
    config_create_library(app, name, path)
}

#[tauri::command]
pub fn open_library(app: AppHandle, library_name: String) -> Result<(), String> {
    let settings = get_library_settings(&app)?;
    let library = settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| format!("Library '{}' not found", library_name))?;
    cm_open_library(library_name, library.path)
}
