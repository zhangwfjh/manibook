use crate::models::document::ImportResult;
use crate::models::llm::LLMSettings;
use crate::services::connection_manager::is_library_open;
use crate::services::cover;
use crate::services::database::{check_exists_by_hash, insert_document};
use crate::services::storage::{create_category_directory, generate_unique_filename, write_file};
use crate::utils::text::normalize_metadata;
use nanoid::nanoid;
use sha256;
use std::path::Path;

pub async fn process_import(
    library_path: &str,
    buffer: &[u8],
    extension: &str,
    llm_settings: &LLMSettings,
) -> Result<ImportResult, String> {
    log::info!(
        "Starting import process for .{} file ({} bytes)",
        extension,
        buffer.len()
    );

    if is_library_open().is_none() {
        log::error!("Import failed: No library open");
        return Err("No library open. Call open_library() first.".to_string());
    }

    let hash = sha256::digest(buffer);
    if check_exists_by_hash(&hash)? {
        log::warn!(
            "Import failed: File with hash {} already exists in library",
            &hash[..16]
        );
        return Err("File already exists in library".to_string());
    }

    let mut metadata = crate::utils::content::extract_document_content(
        buffer,
        extension,
        Some((1, 10)),
        llm_settings,
    )
    .await?;

    metadata.filesize = buffer.len() as i64;
    metadata.filetype = extension.to_string();
    metadata.favorite = false;

    metadata = normalize_metadata(metadata);

    let folder_path =
        create_category_directory(library_path, &metadata.doctype, &metadata.category)?;
    let category_dir = Path::new(library_path).join(&folder_path);

    let new_filename = generate_unique_filename(&category_dir, &metadata.title, extension)?;

    let final_file_path = category_dir.join(&new_filename);
    write_file(&final_file_path, buffer)?;

    let url = Path::new(&folder_path)
        .join(&new_filename)
        .to_string_lossy()
        .replace('\\', "/");
    let id = nanoid!();

    insert_document(&id, &url, &metadata, &hash)?;
    cover::spawn_cover_extraction(
        library_path.to_string(),
        id.clone(),
        final_file_path.clone(),
    );

    log::info!(
        "Successfully imported document: id={}, url='{}', title='{}'",
        id,
        url,
        metadata.title
    );

    Ok(ImportResult {
        success: true,
        metadata: Some(metadata),
        error: None,
    })
}
