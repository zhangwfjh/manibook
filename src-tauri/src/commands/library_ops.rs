use crate::services::database::{self, LibraryStats};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter};
use zip::write::SimpleFileOptions;
use zip::ZipArchive;

static BACKUP_CANCELLED: AtomicBool = AtomicBool::new(false);
// ── Statistics ──────────────────────────────────────────────────────

#[tauri::command]
pub fn get_library_stats() -> Result<LibraryStats, String> {
    database::get_library_stats()
}

// ── Duplicate detection ─────────────────────────────────────────────

#[tauri::command]
pub fn find_duplicates() -> Result<Vec<Vec<crate::models::document::Document>>, String> {
    database::find_duplicates()
}

// ── Backup / restore ────────────────────────────────────────────────

/// Recursively calculate the total size of a directory.
fn dir_size(path: &Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += dir_size(&p);
            } else if let Ok(meta) = entry.metadata() {
                total += meta.len();
            }
        }
    }
    total
}

/// Recursively collect all file paths with their relative paths.
fn collect_files(
    base: &Path,
    current: &Path,
    files: &mut Vec<(PathBuf, PathBuf)>,
) -> Result<(), String> {
    for entry in fs::read_dir(current)
        .map_err(|e| format!("Failed to read dir {}: {}", current.display(), e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            collect_files(base, &path, files)?;
        } else {
            let relative = path
                .strip_prefix(base)
                .map_err(|e| format!("Path strip error: {}", e))?
                .to_path_buf();
            files.push((path, relative));
        }
    }
    Ok(())
}

/// Estimate the library's total size on disk (for the progress bar before backup).
#[tauri::command]
pub fn estimate_backup_size() -> Result<u64, String> {
    let library_path = crate::services::connection_manager::get_library_path()?;
    Ok(dir_size(Path::new(&library_path)))
}

/// Full library backup as a single zip file.
/// Emits `backup-progress` events with { current, total } bytes.
#[tauri::command]
pub async fn backup_library(app: AppHandle, dest_path: String) -> Result<String, String> {
    BACKUP_CANCELLED.store(false, Ordering::Relaxed);

    let library_path = crate::services::connection_manager::get_library_path()?;
    let src = PathBuf::from(&library_path);
    let dest = PathBuf::from(&dest_path);

    log::info!("Starting backup: {}", src.display());

    // Run the blocking zip work on a dedicated thread
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let src = src.as_path();
        let total_size = dir_size(src);

        let file =
            fs::File::create(&dest).map_err(|e| format!("Failed to create backup file: {}", e))?;
        let mut zip = zip::ZipWriter::new(file);
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        let mut all_files = Vec::new();
        collect_files(src, src, &mut all_files)?;

        let mut copied: u64 = 0;
        let mut cancelled = false;
        let mut chunk_count: u64 = 0;

        for (file_path, relative_path) in &all_files {
            if BACKUP_CANCELLED.load(Ordering::Relaxed) {
                cancelled = true;
                break;
            }

            let mut f = fs::File::open(file_path)
                .map_err(|e| format!("Failed to open {}: {}", file_path.display(), e))?;

            zip.start_file(relative_path.to_string_lossy().replace('\\', "/"), options)
                .map_err(|e| format!("Failed to add file to zip: {}", e))?;

            let mut buf = [0u8; 65536];
            loop {
                if chunk_count % 16 == 0 && BACKUP_CANCELLED.load(Ordering::Relaxed) {
                    cancelled = true;
                    break;
                }
                chunk_count += 1;

                let n = f
                    .read(&mut buf)
                    .map_err(|e| format!("Failed to read: {}", e))?;
                if n == 0 {
                    break;
                }
                zip.write_all(&buf[..n])
                    .map_err(|e| format!("Failed to write to zip: {}", e))?;

                copied += n as u64;
                // Emit progress every ~1MB for smooth bar movement
                if chunk_count % 16 == 0 {
                    let _ = app.emit(
                        "backup-progress",
                        serde_json::json!({ "current": copied, "total": total_size }),
                    );
                }
            }

            if cancelled {
                break;
            }
        }

        if cancelled {
            drop(zip);
            let _ = fs::remove_file(&dest);
            log::info!("Backup cancelled by user");
            return Ok("Backup cancelled".to_string());
        }

        zip.finish()
            .map_err(|e| format!("Failed to finalize zip: {}", e))?;

        log::info!("Backup complete: {}", dest.display());
        Ok(dest.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| format!("Backup task failed: {}", e))?;

    result
}

/// Cancel an in-progress backup.
#[tauri::command]
pub fn cancel_backup() {
    BACKUP_CANCELLED.store(true, Ordering::Relaxed);
    log::info!("Backup cancellation requested");
}

/// Restore library from a zip file.
/// Emits `backup-progress` events with { current, total } bytes.
#[tauri::command]
pub async fn restore_library(app: AppHandle, src_path: String) -> Result<(), String> {
    let library_path = crate::services::connection_manager::get_library_path()?;
    let lib_dir = library_path.clone();
    let src_path_clone = src_path.clone();

    let result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let lib_dir = Path::new(&lib_dir);
        let src = Path::new(&src_path_clone);

        if !src.exists() {
            return Err(format!("Backup file not found: {}", src.display()));
        }

        crate::services::connection_manager::close_library()?;

        let zip_file = fs::File::open(src).map_err(|e| format!("Failed to open backup: {}", e))?;
        let mut archive =
            ZipArchive::new(zip_file).map_err(|e| format!("Failed to read zip: {}", e))?;

        let total_size: u64 = (0..archive.len())
            .map(|i| archive.by_index(i).ok().map(|f| f.size()).unwrap_or(0))
            .sum();

        log::info!("Restoring from {} ({} bytes)", src.display(), total_size);

        if let Ok(entries) = fs::read_dir(lib_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let _ = fs::remove_dir_all(&path);
                } else {
                    let _ = fs::remove_file(&path);
                }
            }
        }

        let mut copied: u64 = 0;
        for i in 0..archive.len() {
            let mut entry = archive
                .by_index(i)
                .map_err(|e| format!("Failed to read zip entry: {}", e))?;

            let outpath = match entry.enclosed_name() {
                Some(p) => lib_dir.join(p),
                None => continue,
            };

            if entry.is_dir() {
                fs::create_dir_all(&outpath).map_err(|e| format!("Failed to create dir: {}", e))?;
                continue;
            }

            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent dir: {}", e))?;
            }

            let entry_size = entry.size();
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create {}: {}", outpath.display(), e))?;

            let mut buf = [0u8; 65536];
            loop {
                let n = entry
                    .read(&mut buf)
                    .map_err(|e| format!("Failed to read zip entry: {}", e))?;
                if n == 0 {
                    break;
                }
                outfile
                    .write_all(&buf[..n])
                    .map_err(|e| format!("Failed to write file: {}", e))?;
            }

            copied += entry_size;
            let _ = app.emit(
                "backup-progress",
                serde_json::json!({ "current": copied, "total": total_size }),
            );
        }

        log::info!("Restore complete");
        Ok(())
    })
    .await
    .map_err(|e| format!("Restore task failed: {}", e))?;

    result
}
