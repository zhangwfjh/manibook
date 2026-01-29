use crate::models::{ImportResult, LLMSettings};
use crate::services::database::{check_document_exists_by_hash, insert_document};
use crate::services::llm::{extract_metadata_from_text, extract_text_from_images, find_provider};
use crate::services::storage::{create_category_directory, generate_unique_filename, write_file};
use crate::services::connection_manager::is_library_open;
use crate::utils::text::normalize_metadata;
use nanoid::nanoid;
use sha256;
use std::path::Path;

pub async fn process_document_import(
    library_path: &str,
    buffer: &[u8],
    _original_filename: &str,
    extension: &str,
    llm_settings: &LLMSettings,
) -> Result<ImportResult, String> {
    use crate::extractors::Extractor;

    let hash = sha256::digest(buffer);

    let extraction: crate::extractors::ForewordExtraction = match extension {
        "pdf" => crate::extractors::pdf::PdfExtractor::extract(buffer).await,
        "epub" => crate::extractors::epub::EpubExtractor::extract(buffer).await,
        "djvu" => crate::extractors::djvu::DjvuExtractor::extract(buffer).await,
        _ => return Err(format!("Unsupported file extension: {}", extension)),
    }
    .map_err(|e| format!("Failed to extract content from file: {}", e))?;

    let mut foreword = extraction.foreword;
    let images = extraction.images;
    let num_pages = extraction.num_pages;
    let cover = images.first().cloned();

    if images.len() > 0 && foreword.len() < 100 {
        let image_provider_name = &llm_settings.jobs.imageTextExtraction;
        if !image_provider_name.is_empty() {
            if let Some(image_provider) =
                find_provider(&llm_settings.providers, image_provider_name).ok()
            {
                foreword = extract_text_from_images(&images, image_provider)
                    .await
                    .map_err(|e| format!("Failed to extract text from images: {}", e))?;
            }
        }
    }

    foreword = foreword.chars().take(5000).collect();

    let metadata_provider_name = &llm_settings.jobs.metadataExtraction;
    if metadata_provider_name.is_empty() {
        return Err("Metadata extraction provider not configured".to_string());
    }

    let metadata_provider = find_provider(&llm_settings.providers, metadata_provider_name)
        .map_err(|e| format!("Metadata extraction provider error: {}", e))?;

    let mut metadata = extract_metadata_from_text(&foreword, metadata_provider)
        .await
        .map_err(|e| format!("Failed to extract metadata: {}", e))?;

    metadata.num_pages = num_pages;
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

    if check_document_exists_by_hash(&hash)? {
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

    insert_document(
        &id,
        &new_filename,
        &url,
        &metadata,
        &hash,
        cover.as_ref(),
    )?;

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

    let filename = format!("downloaded.{}", file_extension);

    process_document_import(
        library_path,
        &buffer,
        &filename,
        &file_extension,
        llm_settings,
    )
    .await
}
