use crate::config::llm::get_llm_settings;
use crate::models::document::{
    Category, Document, DocumentList, DocumentQuery, ImportError, ImportRequest, ImportResponse,
    ImportResult, Metadata,
};
use crate::services::connection_manager::{
    close_library as service_close_library, get_library_path,
    is_library_open as service_is_library_open,
};
use crate::services::cover;
use crate::services::database::{
    delete_document, get_basic_info, get_documents as db_get_documents,
    get_library_categories as db_get_library_categories, update_file_info, update_metadata,
};
use crate::services::import::{process_import, process_url_import};
use crate::services::storage::{delete_file, file_exists, get_lib_path, move_file};
use crate::utils::content::get_extension;
use crate::utils::text::normalize_metadata;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

#[tauri::command]
pub async fn generate_metadata(app: AppHandle, document_id: String) -> Result<Metadata, String> {
    log::info!("Starting metadata generation for document: {}", document_id);

    let library_path = get_library_path()?;

    let (url, existing_num_pages, existing_filesize, existing_format, existing_favorite) =
        get_basic_info(&document_id)?;

    let file_url = get_lib_path(&url)?;
    let file_path = Path::new(&library_path).join(file_url);

    if !file_exists(&file_path) {
        log::error!("Document file not found at: {}", file_path.display());
        return Err(format!(
            "Document file not found at: {}",
            file_path.display()
        ));
    }

    log::debug!(
        "Reading file for metadata extraction: {}",
        file_path.display()
    );
    let buffer = fs::read(&file_path).map_err(|e| {
        log::error!("Failed to read file {}: {}", file_path.display(), e);
        format!("Failed to read file {}: {}", file_path.display(), e)
    })?;

    let file_extension = get_extension(&url);
    let llm_settings = get_llm_settings(app)?;

    let mut metadata = crate::utils::content::extract_document_content(
        &buffer,
        &file_extension,
        Some((1, 10)),
        &llm_settings,
    )
    .await?;

    metadata.num_pages = existing_num_pages;
    metadata.filesize = existing_filesize;
    metadata.format = existing_format;
    metadata.favorite = existing_favorite != 0;
    metadata.updated_at = chrono::Utc::now().to_rfc3339();

    metadata = normalize_metadata(metadata);

    log::info!(
        "Successfully generated metadata for document: {}",
        document_id
    );
    Ok(metadata)
}

#[tauri::command]
pub async fn import_documents(
    app: AppHandle,
    request: ImportRequest,
) -> Result<ImportResponse, String> {
    log::info!("Starting document import process");

    let library_path = get_library_path()?;
    let llm_settings = get_llm_settings(app)?;

    let mut results = Vec::new();
    let mut errors = Vec::new();

    let file_count = request.file_data.as_ref().map(|v| v.len()).unwrap_or(0);
    let url_count = request.urls.as_ref().map(|v| v.len()).unwrap_or(0);
    log::info!("Importing {} files and {} URLs", file_count, url_count);

    if let Some(file_data) = &request.file_data {
        for file_datum in file_data {
            match process_import(
                &library_path,
                &file_datum.data,
                &get_extension(&file_datum.filename),
                &llm_settings,
            )
            .await
            {
                Ok(result) => results.push(result),
                Err(e) => {
                    log::warn!("Failed to import file '{}': {}", file_datum.filename, e);
                    results.push(ImportResult {
                        success: false,
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
                    log::warn!("Failed to import URL '{}': {}", url, e);
                    results.push(ImportResult {
                        success: false,
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

    log::info!(
        "Import completed: {} successful, {} failed out of {} total",
        success_count,
        error_count,
        total_processed
    );

    Ok(ImportResponse {
        results,
        errors,
        total_processed,
        success_count,
        error_count,
    })
}

#[tauri::command]
pub async fn get_cover(document_id: String) -> Result<String, String> {
    log::debug!("Fetching cover for document: {}", document_id);

    let library_path = get_library_path()?;
    let cover_data = cover::get_cover(&library_path, &document_id).await?;
    match cover_data {
        Some(data) => {
            log::debug!(
                "Cover found for document: {} ({} bytes)",
                document_id,
                data.len()
            );
            let base64_data = STANDARD.encode(&data);
            Ok(format!("data:image/webp;base64,{}", base64_data))
        }
        None => {
            log::debug!("Cover not found for document: {}", document_id);
            Err("Cover not found".to_string())
        }
    }
}

#[tauri::command]
pub fn delete_documents(document_ids: Vec<String>) -> Result<serde_json::Value, String> {
    log::info!("Starting bulk delete for {} documents", document_ids.len());

    let library_path = get_library_path()?;

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids.clone() {
        log::debug!("Deleting document: {}", document_id);
        match (|| {
            let url = delete_document(&document_id)?;

            let relative_path = get_lib_path(&url)?;
            let file_path = Path::new(&library_path).join(relative_path);
            if file_exists(&file_path) {
                delete_file(&file_path)?;
            }

            Ok::<(), String>(())
        })() {
            Ok(_) => {
                log::debug!("Successfully deleted document: {}", document_id);
                success_count += 1;
            }
            Err(e) => {
                log::error!("Failed to delete document {}: {}", document_id, e);
                errors.push(serde_json::json!({
                    "id": document_id,
                    "error": e
                }));
            }
        }
    }

    log::info!(
        "Bulk delete completed: {} succeeded, {} failed",
        success_count,
        errors.len()
    );

    Ok(serde_json::json!({
        "success": true,
        "deletedCount": success_count,
        "errors": if errors.is_empty() { serde_json::Value::Null } else { serde_json::Value::Array(errors) }
    }))
}

#[tauri::command]
pub fn open_document(document_id: String) -> Result<(), String> {
    log::info!("Opening document: {}", document_id);

    let library_path = get_library_path()?;

    let url = crate::services::database::get_url(&document_id)?;

    let relative_path = get_lib_path(&url)?;
    let file_path = Path::new(&library_path).join(relative_path);
    if !file_exists(&file_path) {
        log::error!(
            "File not found for document {}: {}",
            document_id,
            file_path.display()
        );
        return Err("File not found".to_string());
    }

    log::debug!("Opening file with system default: {}", file_path.display());
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
        log::error!("Unsupported platform for opening document");
        return Err("Unsupported platform".to_string());
    }

    log::info!("Successfully opened document: {}", document_id);
    Ok(())
}

#[tauri::command]
pub fn update_document(document_id: String, metadata: Metadata) -> Result<Document, String> {
    log::info!("Updating document: {}", document_id);

    let library_path = get_library_path()?;

    let normalized_metadata = normalize_metadata(metadata);

    let (
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
        let new_url = move_file(
            &library_path,
            &existing_url,
            &normalized_metadata.doctype,
            &new_category,
            &new_title,
        )?;

        update_file_info(&document_id, &new_url)?;
    }

    let doc = Document {
        id: document_id,
        url: String::new(),
        metadata: normalized_metadata,
        category_path: vec![],
    };

    log::info!("Successfully updated document: {}", doc.id);
    Ok(doc)
}

#[tauri::command]
pub fn move_documents(
    document_ids: Vec<String>,
    doctype: Option<String>,
    category: Option<String>,
) -> Result<serde_json::Value, String> {
    log::info!(
        "Starting move operation for {} documents",
        document_ids.len()
    );

    let has_doctype = doctype.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    let has_category = category.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    if !has_doctype && !has_category {
        log::warn!("Move operation failed: no doctype or category provided");
        return Err("At least one of doctype or category must be provided".to_string());
    }

    let library_path = get_library_path()?;

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids {
        log::debug!("Moving document: {}", document_id);
        match (|| {
            let (existing_url, old_category, old_doctype, title) =
                crate::services::connection_manager::with_connection(|conn| {
                    let mut stmt = conn
                        .prepare("SELECT url, category, doctype, title FROM documents WHERE id = ?")
                        .map_err(|e| format!("Failed to prepare query: {}", e))?;

                    stmt.query_row(rusqlite::params![&document_id], |row| {
                        Ok((
                            row.get::<_, String>(0)?,
                            row.get::<_, String>(1)?,
                            row.get::<_, String>(2)?,
                            row.get::<_, String>(3)?,
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
                let new_url = move_file(
                    &library_path,
                    &existing_url,
                    &new_doctype,
                    &new_category,
                    &title,
                )?;

                update_file_info(&document_id, &new_url)?;
            }

            Ok::<(), String>(())
        })() {
            Ok(_) => {
                log::debug!("Successfully moved document: {}", document_id);
                success_count += 1;
            }
            Err(e) => {
                log::error!("Failed to move document {}: {}", document_id, e);
                errors.push(serde_json::json!({
                    "id": document_id,
                    "error": e
                }));
            }
        }
    }

    log::info!(
        "Move operation completed: {} succeeded, {} failed",
        success_count,
        errors.len()
    );

    Ok(serde_json::json!({
        "success": errors.is_empty(),
        "movedCount": success_count,
        "errorCount": errors.len(),
        "errors": if errors.is_empty() { serde_json::Value::Null } else { serde_json::Value::Array(errors) }
    }))
}

#[tauri::command]
pub fn get_documents(query: DocumentQuery) -> Result<DocumentList, String> {
    log::debug!(
        "Fetching documents with query: category={:?}, search={:?}, page={}",
        query.category,
        query.search_query,
        query.page
    );

    let result = db_get_documents(query)?;
    log::debug!("Retrieved {} documents", result.documents.len());
    Ok(result)
}

#[tauri::command]
pub fn get_library_categories() -> Result<Vec<Category>, String> {
    log::debug!("Fetching library categories");

    let result = db_get_library_categories()?;
    log::debug!("Retrieved {} categories", result.len());
    Ok(result)
}

#[tauri::command]
pub fn close_library() -> Result<(), String> {
    log::info!("Closing library");

    service_close_library()?;
    log::info!("Library closed successfully");
    Ok(())
}

#[tauri::command]
pub fn is_library_open() -> Option<String> {
    let result = service_is_library_open();
    log::debug!(
        "Library open check: {}",
        if result.is_some() { "yes" } else { "no" }
    );
    result
}
