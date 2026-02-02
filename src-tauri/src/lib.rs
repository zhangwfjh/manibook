mod commands;
mod config;
mod extractors;
mod models;
mod services;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
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
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_llm_settings,
            commands::settings::set_llm_settings,
            commands::settings::import_llm_settings,
            commands::library::open_library,
            commands::document::close_library,
            commands::document::is_library_open,
            commands::document::generate_metadata,
            commands::document::import_documents,
            commands::library::get_libraries,
            commands::document::get_library_categories,
            commands::library::get_library,
            commands::library::create_library,
            commands::document::get_cover,
            commands::document::delete_documents,
            commands::document::open_document,
            commands::document::update_document,
            commands::document::move_documents,
            commands::document::get_documents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
