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
use crate::services::import::process_import;
use crate::services::storage::{delete_file, file_exists, get_lib_path, move_file};
use crate::utils::content::get_extension;
use crate::utils::text::normalize_metadata;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use futures_util::future::join_all;
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

#[derive(serde::Serialize)]
pub struct DeleteFilesResponse {
    pub success_count: usize,
    pub failed_count: usize,
    pub errors: Vec<DeleteFileError>,
}

#[derive(serde::Serialize)]
pub struct DeleteFileError {
    pub path: String,
    pub error: String,
}

#[tauri::command]
pub async fn delete_files(file_paths: Vec<String>) -> Result<DeleteFilesResponse, String> {
    log::info!("Deleting {} files", file_paths.len());

    let mut success_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();

    for path in file_paths {
        let file_path = Path::new(&path);
        match delete_file(file_path) {
            Ok(_) => {
                log::debug!("Successfully deleted file: {}", path);
                success_count += 1;
            }
            Err(e) => {
                log::warn!("Failed to delete file {}: {}", path, e);
                errors.push(DeleteFileError { path, error: e });
                failed_count += 1;
            }
        }
    }

    log::info!(
        "Delete files completed: {} successful, {} failed",
        success_count,
        failed_count
    );

    Ok(DeleteFilesResponse {
        success_count,
        failed_count,
        errors,
    })
}

#[tauri::command]
pub async fn generate_metadata(app: AppHandle, document_id: String) -> Result<Metadata, String> {
    log::info!("Starting metadata generation for document: {}", document_id);

    let library_path = get_library_path()?;

    let (url, existing_page_count, existing_filesize, existing_filetype, existing_favorite) =
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

    metadata.page_count = existing_page_count;
    metadata.filesize = existing_filesize;
    metadata.filetype = existing_filetype;
    metadata.favorite = existing_favorite != 0;

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
    log::info!(
        "Starting document import process with {} sources",
        request.sources.len()
    );

    let library_path = get_library_path()?;
    let llm_settings = crate::config::llm::get_llm_settings(app)?;

    let mut all_sources: Vec<(String, String, Vec<u8>)> = Vec::new(); // (filename, source_path, data)

    for source in request.sources {
        match source.source_type.as_str() {
            "file" => {
                if let Some(path) = source.path {
                    let file_path = Path::new(&path);
                    if !file_path.exists() {
                        log::warn!("File not found: {}", path);
                        continue;
                    }
                    let filename = file_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or(&path)
                        .to_string();
                    match fs::read(file_path) {
                        Ok(data) => {
                            all_sources.push((filename.clone(), path, data));
                        }
                        Err(e) => {
                            log::error!("Failed to read file {}: {}", path, e);
                        }
                    }
                }
            }
            "url" => {
                if let Some(url) = source.url {
                    match fetch_url(&url).await {
                        Ok((filename, data)) => {
                            all_sources.push((filename, url, data));
                        }
                        Err(e) => {
                            log::error!("Failed to fetch URL {}: {}", url, e);
                        }
                    }
                }
            }
            _ => {
                log::warn!("Unknown source type: {}", source.source_type);
            }
        }
    }

    log::info!("Collected {} files for import", all_sources.len());

    let mut results = Vec::new();
    let mut errors = Vec::new();

    let futures: Vec<_> = all_sources
        .iter()
        .map(|(filename, source_path, data)| {
            let library_path = library_path.clone();
            let llm_settings = llm_settings.clone();
            let filename = filename.clone();
            let source_path = source_path.clone();
            let data = data.clone();

            async move {
                let extension = get_extension(&filename);
                let result = process_import(&library_path, &data, &extension, &llm_settings).await;
                (filename, source_path, result)
            }
        })
        .collect();

    let results_vec = join_all(futures).await;

    for (filename, source_path, result) in results_vec {
        match result {
            Ok(r) => {
                results.push(ImportResult {
                    success: r.success,
                    filename: filename.clone(),
                    source_path: Some(source_path),
                    metadata: r.metadata,
                    error: r.error,
                });
            }
            Err(e) => {
                log::warn!("Failed to import file '{}': {}", filename, e);
                results.push(ImportResult {
                    success: false,
                    filename: filename.clone(),
                    source_path: Some(source_path),
                    metadata: None,
                    error: Some(e.clone()),
                });
                errors.push(ImportError {
                    source: filename,
                    error: e,
                });
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

async fn fetch_url(url: &str) -> Result<(String, Vec<u8>), String> {
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("HTTP error: {}", status));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let extension = if content_type.contains("pdf") {
        "pdf"
    } else if content_type.contains("epub") {
        "epub"
    } else if content_type.contains("djvu") {
        "djvu"
    } else {
        let ext = url.rsplit('.').next().unwrap_or("");
        if ["pdf", "epub", "djvu"].contains(&ext) {
            ext
        } else {
            "pdf"
        }
    };

    let filename = url
        .split('/')
        .last()
        .filter(|s| s.contains('.'))
        .map(|s| format!("{}.{}", &s[..s.len() - 4], extension))
        .unwrap_or_else(|| format!("document.{}", extension));

    let data = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok((filename, data.to_vec()))
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
        _existing_page_count,
        _existing_filesize,
        _existing_filetype,
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
                conn.execute(
                    "UPDATE documents SET doctype = ?, category = ? WHERE id = ?",
                    rusqlite::params![new_doctype, new_category, document_id],
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
