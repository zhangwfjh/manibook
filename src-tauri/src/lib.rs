mod config;
mod extractors;
mod models;
mod services;
mod utils;

use crate::config::library::{
    create_library, get_default_library, get_libraries, get_library_settings, set_default_library,
};
use crate::config::llm::{get_llm_settings, import_llm_settings, set_llm_settings};
use crate::extractors::Extractor;
use crate::models::{
    DocumentListResponse, DocumentMetadata, DocumentQuery, ImportError, ImportRequest,
    ImportResponse, ImportResult, Library, LibraryCategory, LibrarySettings,
};
use crate::services::database::{
    delete_document, get_document_basic_info, get_document_cover_base64, get_document_url,
    get_documents as db_get_documents, get_library_categories as db_get_library_categories,
    open_database, update_document_file_info, update_document_metadata,
};
use crate::services::import::{process_document_import, process_url_import};
use crate::services::llm::{extract_metadata_from_text, extract_text_from_images, find_provider};
use crate::services::storage::{delete_file, file_exists, get_lib_path, move_file};
use crate::utils::path::get_extension;
use crate::utils::text::normalize_metadata;
use std::fs;
use std::path::Path;
use std::process::Command;

#[tauri::command]
async fn generate_metadata(
    library_name: String,
    document_id: String,
) -> Result<DocumentMetadata, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| format!("Library '{}' not found", library_name))?;

    let conn = open_database(&library.path)?;
    let (filename, url, existing_num_pages, existing_filesize, existing_format, existing_favorite) =
        get_document_basic_info(&conn, &document_id)?;

    let file_url = get_lib_path(&url)?;
    let file_path = Path::new(&library.path).join(file_url);

    if !file_exists(&file_path) {
        return Err(format!(
            "Document file not found at: {}",
            file_path.display()
        ));
    }

    let buffer = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;

    let file_extension = get_extension(&filename);

    let extraction: extractors::ForewordExtraction = match file_extension.as_str() {
        "pdf" => extractors::pdf::PdfExtractor::extract(&buffer).await,
        "epub" => extractors::epub::EpubExtractor::extract(&buffer).await,
        "djvu" => extractors::djvu::DjvuExtractor::extract(&buffer).await,
        _ => {
            return Err(format!(
                "Unsupported file extension: '{}'. Supported extensions: pdf, epub, djvu",
                file_extension
            ))
        }
    }
    .map_err(|e| format!("Failed to extract content from file: {}", e))?;

    let mut foreword = extraction.foreword;
    let images = extraction.images;

    let llm_settings = get_llm_settings()?;

    if images.len() > 0 && foreword.len() < 100 {
        let image_provider_name = &llm_settings.jobs.imageTextExtraction;
        if image_provider_name.is_empty() {
            return Err("Image text extraction provider not configured in LLM settings (llm.json > jobs.imageTextExtraction)".to_string());
        }

        let image_provider = find_provider(&llm_settings.providers, image_provider_name)
            .map_err(|e| e.to_string())?;

        foreword = extract_text_from_images(&images, image_provider)
            .await
            .map_err(|e| format!("Failed to extract text from images: {}", e))?;
    }

    foreword = foreword.chars().take(5000).collect();

    let metadata_provider_name = &llm_settings.jobs.metadataExtraction;
    if metadata_provider_name.is_empty() {
        return Err("Metadata extraction provider not configured in LLM settings (llm.json > jobs.metadataExtraction)".to_string());
    }

    let metadata_provider = find_provider(&llm_settings.providers, metadata_provider_name)
        .map_err(|e| e.to_string())?;

    let mut metadata = extract_metadata_from_text(&foreword, metadata_provider).await?;

    metadata.num_pages = existing_num_pages;
    metadata.filesize = existing_filesize;
    metadata.format = existing_format;
    metadata.favorite = existing_favorite != 0;
    metadata.updated_at = chrono::Utc::now().to_rfc3339();

    metadata = normalize_metadata(metadata);

    Ok(metadata)
}

#[tauri::command]
async fn import_documents(
    library_name: String,
    request: ImportRequest,
) -> Result<ImportResponse, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| format!("Library '{}' not found", library_name))?;

    let llm_settings = get_llm_settings()?;

    let mut results = Vec::new();
    let mut errors = Vec::new();

    if let Some(file_data) = &request.file_data {
        for file_datum in file_data {
            match process_document_import(
                &library.path,
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
            match process_url_import(&library.path, url, &llm_settings).await {
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
fn rename_library(old_name: String, new_name: String) -> Result<(), String> {
    if old_name.trim().is_empty() || new_name.trim().is_empty() {
        return Err("Library names cannot be empty".to_string());
    }

    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    if settings.libraries.iter().any(|lib| lib.name == new_name) {
        return Err("New library name already exists".to_string());
    }

    let library = settings
        .libraries
        .iter_mut()
        .find(|lib| lib.name == old_name)
        .ok_or_else(|| "Library not found".to_string())?;

    library.name = new_name.trim().to_string();

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
fn archive_library(library_name: String) -> Result<(), String> {
    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    let index = settings
        .libraries
        .iter()
        .position(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    settings.libraries.remove(index);

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
fn move_library(library_name: String, new_path: String) -> Result<(), String> {
    if library_name.trim().is_empty() || new_path.trim().is_empty() {
        return Err("Library name and path cannot be empty".to_string());
    }

    if !new_path.starts_with('/') && !new_path.chars().nth(1).map_or(false, |c| c == ':') {
        return Err("Invalid path format".to_string());
    }

    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    let library = settings
        .libraries
        .iter_mut()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let old_path = &library.path;

    if old_path == &new_path {
        return Err("New path is the same as the current path".to_string());
    }

    if Path::new(&new_path).exists() {
        let entries = fs::read_dir(&new_path)
            .map_err(|e| format!("Failed to read target directory: {}", e))?;
        if entries.count() > 0 {
            return Err("Target directory is not empty".to_string());
        }
        fs::remove_dir(&new_path)
            .map_err(|e| format!("Failed to remove target directory: {}", e))?;
    }

    fs::rename(&old_path, &new_path.trim())
        .map_err(|e| format!("Failed to move library directory: {}", e))?;

    library.path = new_path.trim().to_string();

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_document_cover(library_name: String, document_id: String) -> Result<String, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let conn = open_database(&library.path)?;
    get_document_cover_base64(&conn, &document_id)
}

#[tauri::command]
fn delete_documents(
    library_name: String,
    document_ids: Vec<String>,
) -> Result<serde_json::Value, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let conn = open_database(&library.path)?;

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids.clone() {
        match (|| {
            let url = delete_document(&conn, &document_id)?;

            let relative_path = get_lib_path(&url)?;
            let file_path = Path::new(&library.path).join(relative_path);
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
fn open_document(library_name: String, document_id: String) -> Result<(), String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let conn = open_database(&library.path)?;
    let url = get_document_url(&conn, &document_id)?;

    let relative_path = get_lib_path(&url)?;
    let file_path = Path::new(&library.path).join(relative_path);
    if !file_exists(&file_path) {
        return Err("File not found".to_string());
    }

    let file_path_str = file_path.to_string_lossy();

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/c", "start", "", &file_path_str])
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
    library_name: String,
    document_id: String,
    metadata: DocumentMetadata,
) -> Result<crate::models::LibraryDocument, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let normalized_metadata = normalize_metadata(metadata);

    let conn = open_database(&library.path)?;
    let existing_info = get_document_basic_info(&conn, &document_id)?;
    let (existing_filename, existing_url, _, _, _, _) = existing_info;

    let new_category = normalized_metadata.category.clone();
    let new_title = normalized_metadata.title.clone();

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

    update_document_metadata(&conn, &document_id, &normalized_metadata)?;

    if old_category != new_category
        || old_title != new_title
        || old_doctype != normalized_metadata.doctype
    {
        let (new_filename, new_url) = move_file(
            &library.path,
            &existing_filename,
            &existing_url,
            &normalized_metadata.doctype,
            &new_category,
            &new_title,
            &conn,
        )?;

        update_document_file_info(&conn, &document_id, &new_filename, &new_url)?;
    }

    let doc = crate::models::LibraryDocument {
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
    library_name: String,
    document_ids: Vec<String>,
    doctype: Option<String>,
    category: Option<String>,
) -> Result<serde_json::Value, String> {
    let has_doctype = doctype.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    let has_category = category.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    if !has_doctype && !has_category {
        return Err("At least one of doctype or category must be provided".to_string());
    }

    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let conn = open_database(&library.path)?;

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids {
        match (|| {
            let mut stmt = conn
                .prepare(
                    "SELECT filename, url, category, doctype, title FROM documents WHERE id = ?",
                )
                .map_err(|e| format!("Failed to prepare query: {}", e))?;

            let (existing_filename, existing_url, old_category, old_doctype, title) = stmt
                .query_row(rusqlite::params![&document_id], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, String>(4)?,
                    ))
                })
                .map_err(|e| format!("Failed to find document: {}", e))?;

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

            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE documents SET doctype = ?, category = ?, updatedAt = ? WHERE id = ?",
                rusqlite::params![new_doctype, new_category, now, document_id],
            )
            .map_err(|e| format!("Failed to update document: {}", e))?;

            if old_category != new_category || old_doctype != new_doctype {
                let (new_filename, new_url) = move_file(
                    &library.path,
                    &existing_filename,
                    &existing_url,
                    &new_doctype,
                    &new_category,
                    &title,
                    &conn,
                )?;

                update_document_file_info(&conn, &document_id, &new_filename, &new_url)?;
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
fn get_documents(
    library_name: String,
    query: DocumentQuery,
) -> Result<DocumentListResponse, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let conn = open_database(&library.path)?;
    db_get_documents(&conn, &query, &library.path)
}

#[tauri::command]
fn get_library_categories(library_name: String) -> Result<Vec<LibraryCategory>, String> {
    let settings = get_library_settings()?;
    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;
    let conn = open_database(&library.path)?;
    db_get_library_categories(&conn)
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
            get_default_library,
            set_default_library,
            generate_metadata,
            import_documents,
            get_libraries,
            get_library_categories,
            get_library,
            create_library,
            rename_library,
            archive_library,
            move_library,
            get_document_cover,
            delete_documents,
            open_document,
            update_document,
            move_documents,
            get_documents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
