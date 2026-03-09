mod commands;
mod config;
mod extractors;
mod models;
mod services;
mod utils;

use tauri::Manager;
use tauri_plugin_log::{RotationStrategy, Target, TargetKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let log_dir = app.path().app_local_data_dir().unwrap().join("logs");
            std::fs::create_dir_all(&log_dir).unwrap_or_else(|_| {
                eprintln!("Failed to create log directory at {:?}", log_dir);
            });

            let log_level = if cfg!(debug_assertions) {
                log::LevelFilter::Debug
            } else {
                log::LevelFilter::Info
            };

            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .targets([
                        Target::new(TargetKind::Stdout),
                        Target::new(TargetKind::LogDir {
                            file_name: Some("manibook".to_string()),
                        }),
                    ])
                    .level(log_level)
                    .rotation_strategy(RotationStrategy::KeepAll)
                    .max_file_size(10 * 1024 * 1024) // 10MB
                    .build(),
            )?;

            let resource_dir = app
                .path()
                .resource_dir()
                .map_err(|e| format!("Failed to get resource directory: {}", e))?;
            extractors::pdf::init_pdfium(&resource_dir)
                .map_err(|e| format!("Failed to initialize PDFium: {}", e))?;

            services::models_dev::prefetch_models();

            log::info!("Application started");
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
            commands::logs::get_logs_info,
            commands::logs::export_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
