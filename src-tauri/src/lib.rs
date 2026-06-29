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
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let log_dir = app.path().app_local_data_dir().unwrap().join("logs");
            std::fs::create_dir_all(&log_dir).unwrap_or_else(|_| {
                eprintln!("Failed to create log directory at {:?}", log_dir);
            });

            // Clean up old log files at startup (keep only the 5 most recent)
            cleanup_old_logs(&log_dir);

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
                    .rotation_strategy(RotationStrategy::KeepOne)
                    .max_file_size(10 * 1024 * 1024) // 10MB per file
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
            commands::library::remove_library,
            commands::document::get_cover,
            commands::document::delete_documents,
            commands::document::delete_files,
            commands::document::open_document,
            commands::document::update_document,
            commands::document::move_documents,
            commands::document::get_documents,
            commands::logs::get_logs_info,
            commands::logs::export_logs,
            // Statistics
            commands::library_ops::get_library_stats,
            // Duplicate detection
            commands::library_ops::find_duplicates,
            // Backup / restore
            commands::library_ops::backup_library,
            commands::library_ops::estimate_backup_size,
            commands::library_ops::cancel_backup,
            commands::library_ops::restore_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Remove old rotated log files, keeping only the 5 most recent.
fn cleanup_old_logs(log_dir: &std::path::Path) {
    let Ok(entries) = std::fs::read_dir(log_dir) else {
        return;
    };
    let mut logs: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .is_some_and(|ext| ext == "log" || e.path().to_string_lossy().contains("manibook"))
        })
        .filter_map(|e| {
            e.metadata()
                .ok()
                .and_then(|m| m.modified().ok())
                .map(|modified| (e.path(), modified))
        })
        .collect();

    // Sort by modified time, newest first
    logs.sort_by(|a, b| b.1.cmp(&a.1));

    // Delete everything beyond the 5 most recent
    for (path, _) in logs.iter().skip(5) {
        let _ = std::fs::remove_file(path);
    }
}
