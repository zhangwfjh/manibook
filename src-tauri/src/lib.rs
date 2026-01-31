mod config;
mod extractors;
mod models;
mod services;
mod utils;

use crate::config::library::{create_library, get_libraries, get_library_settings};
use crate::config::llm::{get_llm_settings, import_llm_settings, set_llm_settings};
use crate::models::{ImportError, ImportRequest, ImportResponse, ImportResult, Library, Metadata};
use crate::services::connection_manager::{
    close_library, get_library_path, is_library_open, open_library as cm_open_library,
};
use crate::services::database::{
    delete_document, get_basic_info, get_cover as get_cover_blob, get_documents,
    get_library_categories, get_url, update_file_info, update_metadata,
};
use crate::services::import::{process_import, process_url_import};
use crate::services::storage::{delete_file, file_exists, get_lib_path, move_file};
use crate::utils::content::{
    extract_content, extract_metadata, extract_text_from_images_if_needed, get_extension,
};
use crate::utils::text::normalize_metadata;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::fs;
use std::path::Path;
use std::process::Command;

#[tauri::command]
async fn generate_metadata(document_id: String) -> Result<Metadata, String> {
    let library_path = get_library_path()?;

    let (filename, url, existing_num_pages, existing_filesize, existing_format, existing_favorite) =
        get_basic_info(&document_id)?;

    let file_url = get_lib_path(&url)?;
    let file_path = Path::new(&library_path).join(file_url);

    if !file_exists(&file_path) {
        return Err(format!(
            "Document file not found at: {}",
            file_path.display()
        ));
    }

    let buffer = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;

    let file_extension = get_extension(&filename);

    let extraction = extract_content(&buffer, &file_extension)
        .await
        .map_err(|e| format!("Failed to extract content from file: {}", e))?;

    let mut foreword = extraction.foreword;
    let images = extraction.images;

    let llm_settings = get_llm_settings()?;

    foreword = extract_text_from_images_if_needed(&foreword, &images, &llm_settings)
        .await
        .map_err(|e| format!("Failed to extract text from images: {}", e))?;

    foreword = foreword.chars().take(5000).collect();

    let mut metadata = extract_metadata(&foreword, &llm_settings).await?;

    metadata.num_pages = existing_num_pages;
    metadata.filesize = existing_filesize;
    metadata.format = existing_format;
    metadata.favorite = existing_favorite != 0;
    metadata.updated_at = chrono::Utc::now().to_rfc3339();

    metadata = normalize_metadata(metadata);

    Ok(metadata)
}

#[tauri::command]
async fn import_documents(request: ImportRequest) -> Result<ImportResponse, String> {
    let library_path = get_library_path()?;

    let llm_settings = get_llm_settings()?;

    let mut results = Vec::new();
    let mut errors = Vec::new();

    if let Some(file_data) = &request.file_data {
        for file_datum in file_data {
            match process_import(
                &library_path,
                &file_datum.data,
                &file_datum.filename,
                &get_extension(&file_datum.filename),
                &llm_settings,
            )
            .await
            {
                Ok(result) => results.push(result),
                Err(e) => {
                    results.push(ImportResult {
                        success: false,
                        filename: Some(file_datum.filename.clone()),
                        metadata: None,
                        error: Some(e.clone()),
                    });
                    errors.push(ImportError {
                        source: file_datum.filename.clone(),
                        error: e,
                    });
                }
            }
        }
    }

    if let Some(urls) = &request.urls {
        for url in urls {
            match process_url_import(&library_path, url, &llm_settings).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    results.push(ImportResult {
                        success: false,
                        filename: None,
                        metadata: None,
                        error: Some(e.clone()),
                    });
                    errors.push(ImportError {
                        source: url.clone(),
                        error: e,
                    });
                }
            }
        }
    }

    let success_count = results.iter().filter(|r| r.success).count();
    let error_count = results.iter().filter(|r| !r.success).count();
    let total_processed = results.len();

    Ok(ImportResponse {
        results,
        errors,
        total_processed,
        success_count,
        error_count,
    })
}

#[tauri::command]
fn get_library(library_name: String) -> Result<Library, String> {
    let settings = get_library_settings()?;
    settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())
}

#[tauri::command]
fn get_cover(document_id: String) -> Result<String, String> {
    let cover_data = get_cover_blob(&document_id)?;

    match cover_data {
        Some(data) => {
            let base64 = STANDARD.encode(&data);
            Ok(format!("data:image/webp;base64,{}", base64))
        }
        None => Err("Cover not found".to_string()),
    }
}

#[tauri::command]
fn delete_documents(document_ids: Vec<String>) -> Result<serde_json::Value, String> {
    let library_path = get_library_path()?;

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids.clone() {
        match (|| {
            let url = delete_document(&document_id)?;

            let relative_path = get_lib_path(&url)?;
            let file_path = Path::new(&library_path).join(relative_path);
            if file_exists(&file_path) {
                delete_file(&file_path)?;
            }

            Ok::<(), String>(())
        })() {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "id": document_id,
                "error": e
            })),
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "deletedCount": success_count,
        "errors": if errors.is_empty() { serde_json::Value::Null } else { serde_json::Value::Array(errors) }
    }))
}

#[tauri::command]
fn open_document(document_id: String) -> Result<(), String> {
    let library_path = get_library_path()?;

    let url = get_url(&document_id)?;

    let relative_path = get_lib_path(&url)?;
    let file_path = Path::new(&library_path).join(relative_path);
    if !file_exists(&file_path) {
        return Err("File not found".to_string());
    }

    let file_path_str = file_path.to_string_lossy();

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", &file_path_str])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&*file_path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&*file_path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        return Err("Unsupported platform".to_string());
    }

    Ok(())
}

#[tauri::command]
fn update_document(
    document_id: String,
    metadata: Metadata,
) -> Result<crate::models::Document, String> {
    let library_path = get_library_path()?;

    let normalized_metadata = normalize_metadata(metadata);

    let (
        existing_filename,
        existing_url,
        _existing_num_pages,
        _existing_filesize,
        _existing_format,
        _existing_favorite,
    ) = get_basic_info(&document_id)?;

    let new_category = normalized_metadata.category.clone();
    let new_title = normalized_metadata.title.clone();

    let (old_category, old_title, old_doctype) =
        crate::services::connection_manager::with_connection(|conn| {
            let old_category = conn
                .query_row(
                    "SELECT category FROM documents WHERE id = ?",
                    rusqlite::params![&document_id],
                    |row| row.get::<_, String>(0),
                )
                .map_err(|e| format!("Failed to get existing category: {}", e))?;

            let old_title = conn
                .query_row(
                    "SELECT title FROM documents WHERE id = ?",
                    rusqlite::params![&document_id],
                    |row| row.get::<_, String>(0),
                )
                .map_err(|e| format!("Failed to get existing title: {}", e))?;

            let old_doctype = conn
                .query_row(
                    "SELECT doctype FROM documents WHERE id = ?",
                    rusqlite::params![&document_id],
                    |row| row.get::<_, String>(0),
                )
                .map_err(|e| format!("Failed to get existing doctype: {}", e))?;

            Ok::<_, String>((old_category, old_title, old_doctype))
        })?;

    update_metadata(&document_id, &normalized_metadata)?;

    if old_category != new_category
        || old_title != new_title
        || old_doctype != normalized_metadata.doctype
    {
        let (new_filename, new_url) = move_file(
            &library_path,
            &existing_filename,
            &existing_url,
            &normalized_metadata.doctype,
            &new_category,
            &new_title,
        )?;

        update_file_info(&document_id, &new_filename, &new_url)?;
    }

    let doc = crate::models::Document {
        id: document_id,
        path: String::new(),
        filename: String::new(),
        url: String::new(),
        metadata: normalized_metadata,
        category_path: vec![],
    };
    Ok(doc)
}

#[tauri::command]
fn move_documents(
    document_ids: Vec<String>,
    doctype: Option<String>,
    category: Option<String>,
) -> Result<serde_json::Value, String> {
    let has_doctype = doctype.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    let has_category = category.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    if !has_doctype && !has_category {
        return Err("At least one of doctype or category must be provided".to_string());
    }

    let library_path = get_library_path()?;

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids {
        match (|| {
            let (existing_filename, existing_url, old_category, old_doctype, title) =
                crate::services::connection_manager::with_connection(|conn| {
                    let mut stmt = conn
                        .prepare(
                            "SELECT filename, url, category, doctype, title FROM documents WHERE id = ?",
                        )
                        .map_err(|e| format!("Failed to prepare query: {}", e))?;

                    stmt.query_row(rusqlite::params![&document_id], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, String>(3)?,
                            row.get::<_, String>(4)?,
                        ))
                    })
                    .map_err(|e| format!("Failed to find document: {}", e))
                })?;

            let new_doctype = doctype
                .as_ref()
                .filter(|s| !s.is_empty())
                .unwrap_or(&old_doctype)
                .clone();
            let new_category = category
                .as_ref()
                .filter(|s| !s.is_empty())
                .unwrap_or(&old_category)
                .clone();

            crate::services::connection_manager::with_connection(|conn| {
                let now = chrono::Utc::now().to_rfc3339();
                conn.execute(
                    "UPDATE documents SET doctype = ?, category = ?, updatedAt = ? WHERE id = ?",
                    rusqlite::params![new_doctype, new_category, now, document_id],
                )
                .map_err(|e| format!("Failed to update document: {}", e))
            })?;

            if old_category != new_category || old_doctype != new_doctype {
                let (new_filename, new_url) = move_file(
                    &library_path,
                    &existing_filename,
                    &existing_url,
                    &new_doctype,
                    &new_category,
                    &title,
                )?;

                update_file_info(&document_id, &new_filename, &new_url)?;
            }

            Ok::<(), String>(())
        })() {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "id": document_id,
                "error": e
            })),
        }
    }

    Ok(serde_json::json!({
        "success": errors.is_empty(),
        "movedCount": success_count,
        "errorCount": errors.len(),
        "errors": if errors.is_empty() { serde_json::Value::Null } else { serde_json::Value::Array(errors) }
    }))
}

#[tauri::command]
fn open_library(library_name: String) -> Result<(), String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| format!("Library '{}' not found", library_name))?;
    cm_open_library(library_name, library.path)
}

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
            get_llm_settings,
            set_llm_settings,
            import_llm_settings,
            open_library,
            close_library,
            is_library_open,
            generate_metadata,
            import_documents,
            get_libraries,
            get_library_categories,
            get_library,
            create_library,
            get_cover,
            delete_documents,
            open_document,
            update_document,
            move_documents,
            get_documents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
