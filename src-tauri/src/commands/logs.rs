use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize)]
pub struct LogFileInfo {
    pub name: String,
    pub size: u64,
    pub modified: Option<String>,
}

#[derive(serde::Serialize)]
pub struct LogsInfo {
    pub files: Vec<LogFileInfo>,
    pub total_size: u64,
    pub log_dir: String,
}

#[tauri::command]
pub async fn get_logs_info(app: AppHandle) -> Result<LogsInfo, String> {
    let log_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("logs");

    let mut files = Vec::new();
    let mut total_size = 0u64;

    if let Ok(entries) = fs::read_dir(&log_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "log" || (ext.to_str().unwrap_or("").starts_with("log")) {
                    let metadata = entry.metadata().ok();
                    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                    let modified = metadata.as_ref().and_then(|m| m.modified().ok()).map(|t| {
                        chrono::DateTime::<chrono::Local>::from(t)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                    });

                    total_size += size;
                    files.push(LogFileInfo {
                        name: path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string(),
                        size,
                        modified,
                    });
                }
            }
        }
    }

    files.sort_by(|a, b| b.name.cmp(&a.name));

    Ok(LogsInfo {
        files,
        total_size,
        log_dir: log_dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn export_logs(app: AppHandle, target_path: String) -> Result<(), String> {
    log::info!("Exporting logs to: {}", target_path);

    let log_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("logs");

    if !log_dir.exists() {
        return Err(format!(
            "Log directory does not exist: {}",
            log_dir.display()
        ));
    }

    let mut log_files: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = fs::read_dir(&log_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy();
                if ext_str == "log" || ext_str.starts_with("log") {
                    log_files.push(path);
                }
            }
        }
    }

    if log_files.is_empty() {
        return Err(format!(
            "No log files found in directory: {}",
            log_dir.display()
        ));
    }

    log_files.sort_by(|a, b| {
        let a_name = a.file_name().unwrap_or_default();
        let b_name = b.file_name().unwrap_or_default();
        b_name.cmp(&a_name)
    });

    let target = PathBuf::from(&target_path);

    if target.is_dir() {
        let mut exported_count = 0;
        for path in &log_files {
            let file_name = path.file_name().unwrap_or_default();
            let dest = target.join(file_name);
            match fs::copy(path, &dest) {
                Ok(_) => exported_count += 1,
                Err(e) => log::warn!("Failed to copy {}: {}", path.display(), e),
            }
        }

        if exported_count == 0 {
            return Err("Failed to export any log files".to_string());
        }

        log::info!(
            "Exported {} log files to directory: {}",
            exported_count,
            target.display()
        );
    } else {
        let mut content = String::new();
        content.push_str("=== ManiBook Log Export ===\n");
        content.push_str(&format!(
            "Exported at: {}\n",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ));
        content.push_str("========================\n\n");

        for path in &log_files {
            content.push_str(&format!(
                "\n=== File: {} ===\n",
                path.file_name().unwrap_or_default().to_string_lossy()
            ));

            match fs::read_to_string(path) {
                Ok(file_content) => content.push_str(&file_content),
                Err(e) => {
                    log::warn!("Failed to read {}: {}", path.display(), e);
                    content.push_str(&format!("[Error reading file: {}]\n", e));
                }
            }
            content.push_str("\n\n");
        }

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }

        fs::write(&target, content)
            .map_err(|e| format!("Failed to write log export file: {}", e))?;

        log::info!(
            "Exported {} log files to single file: {}",
            log_files.len(),
            target.display()
        );
    }

    Ok(())
}
