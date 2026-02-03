use crate::extractors::{djvu::DjvuExtractor, epub::EpubExtractor, pdf::PdfExtractor, Extractor};
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
    let hash = sha256::digest(buffer);

    let images: Vec<Vec<u8>> = match extension {
        "pdf" => PdfExtractor::extract_images(buffer, Some(1), Some(1)).await,
        "epub" => EpubExtractor::extract_images(buffer, Some(1), Some(1)).await,
        "djvu" => DjvuExtractor::extract_images(buffer, Some(1), Some(1)).await,
        _ => Err(format!("Unsupported file extension: '{}'", extension)),
    }
    .map_err(|e| format!("Failed to extract cover image: {}", e))?;

    let cover = images.first().cloned();

    let mut metadata = crate::utils::content::extract_document_content(
        buffer,
        extension,
        Some((1, 10)),
        llm_settings,
    )
    .await?;

    metadata.filesize = buffer.len() as i64;
    metadata.format = extension.to_string();
    metadata.favorite = false;
    metadata.updated_at = chrono::Utc::now().to_rfc3339();

    metadata = normalize_metadata(metadata);

    if is_library_open().is_none() {
        return Err("No library open. Call open_library() first.".to_string());
    }

    let folder_path =
        create_category_directory(library_path, &metadata.doctype, &metadata.category)?;
    let category_dir = Path::new(library_path).join(&folder_path);

    let new_filename = generate_unique_filename(&category_dir, &metadata.title, extension)?;

    if check_exists_by_hash(&hash)? {
        return Err("File already exists in library".to_string());
    }

    let final_file_path = category_dir.join(&new_filename);
    write_file(&final_file_path, buffer)?;

    let url = format!(
        "lib://{}",
        Path::new(&folder_path)
            .join(&new_filename)
            .to_string_lossy()
            .replace('\\', "/")
    );
    let id = nanoid!();

    insert_document(&id, &new_filename, &url, &metadata, &hash)?;
    if let Some(ref cover_data) = cover {
        cover::save_cover(library_path, &id, cover_data.as_slice())?;
    }

    Ok(ImportResult {
        success: true,
        filename: Some(new_filename),
        metadata: Some(metadata),
        error: None,
    })
}

pub async fn process_url_import(
    library_path: &str,
    url: &str,
    llm_settings: &LLMSettings,
) -> Result<ImportResult, String> {
    reqwest::Url::parse(url).map_err(|e| format!("Invalid URL format: {}", e))?;

    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; LibraryImporter/1.0)",
        )
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("Failed to download file: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "HTTP {}: {}",
            response.status(),
            response
                .status()
                .canonical_reason()
                .unwrap_or("Unknown error")
        ));
    }

    let content_length = response.content_length();
    if let Some(len) = content_length {
        if len > 100 * 1024 * 1024 {
            return Err("File too large (max 100MB)".to_string());
        }
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|ct| ct.to_str().ok())
        .unwrap_or("");

    let parsed_url = reqwest::Url::parse(url).map_err(|e| format!("Failed to parse URL: {}", e))?;
    let url_path = parsed_url.path();

    let mut file_extension = Path::new(url_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    if file_extension.is_empty() {
        if content_type.contains("pdf") {
            file_extension = "pdf".to_string();
        } else if content_type.contains("epub") {
            file_extension = "epub".to_string();
        } else if content_type.contains("djvu") {
            file_extension = "djvu".to_string();
        } else {
            return Err("Unable to determine file type from URL".to_string());
        }
    }

    let allowed_extensions = ["pdf", "epub", "djvu"];
    if !allowed_extensions.contains(&file_extension.as_str()) {
        return Err(format!(
            "Unsupported file type '{}'. Only PDF, EPUB, and DJVU are supported",
            file_extension
        ));
    }

    let buffer = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?
        .to_vec();

    process_import(library_path, &buffer, &file_extension, llm_settings).await
}
