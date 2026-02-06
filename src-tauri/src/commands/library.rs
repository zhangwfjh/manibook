use crate::config::library::{
    create_library as config_create_library, get_libraries as config_get_libraries,
    get_library_settings,
};
use crate::models::library::Library;
use crate::services::connection_manager::open_library as cm_open_library;
use tauri::AppHandle;

#[tauri::command]
pub fn get_libraries(app: AppHandle) -> Result<Vec<Library>, String> {
    log::debug!("Fetching all libraries");

    let result = config_get_libraries(app)?;
    log::debug!("Found {} libraries", result.len());
    Ok(result)
}

#[tauri::command]
pub fn get_library(app: AppHandle, library_name: String) -> Result<Library, String> {
    log::debug!("Fetching library: {}", library_name);

    let settings = get_library_settings(&app)?;
    let library = settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| {
            log::warn!("Library not found: {}", library_name);
            "Library not found".to_string()
        })?;

    log::debug!("Found library: {} at {}", library.name, library.path);
    Ok(library)
}

#[tauri::command]
pub fn create_library(app: AppHandle, name: String, path: String) -> Result<(), String> {
    log::info!("Creating library '{}' at path: {}", name, path);

    config_create_library(app, name.clone(), path.clone())?;
    log::info!("Successfully created library '{}'", name);
    Ok(())
}

#[tauri::command]
pub fn open_library(app: AppHandle, library_name: String) -> Result<(), String> {
    log::info!("Opening library: {}", library_name);

    let settings = get_library_settings(&app)?;
    let library = settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| {
            let err_msg = format!("Library '{}' not found", library_name);
            log::error!("{}", err_msg);
            err_msg
        })?;

    log::debug!(
        "Found library settings: {} at {}",
        library.name,
        library.path
    );
    cm_open_library(library_name.clone(), library.path)?;
    log::info!("Successfully opened library: {}", library_name);
    Ok(())
}
