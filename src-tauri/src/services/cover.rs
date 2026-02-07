use crate::extractors::{djvu::DjvuExtractor, epub::EpubExtractor, pdf::PdfExtractor, Extractor};
use crate::services::database::get_basic_info;
use crate::services::storage::get_lib_path;
use crate::utils::content::get_extension;
use lazy_static::lazy_static;
use lru::LruCache;
use std::fs;
use std::path::Path;
use std::sync::Mutex;

lazy_static! {
    static ref COVER_CACHE: Mutex<LruCache<String, Vec<u8>>> =
        Mutex::new(LruCache::new(std::num::NonZeroUsize::new(100).unwrap()));
}

pub fn get_cover_path(library_path: &str, document_id: &str) -> std::path::PathBuf {
    Path::new(library_path)
        .join(".covers")
        .join(format!("{}.webp", document_id))
}

pub async fn get_cover(library_path: &str, document_id: &str) -> Result<Option<Vec<u8>>, String> {
    {
        let mut cache = COVER_CACHE
            .lock()
            .map_err(|e| format!("Cache lock error: {}", e))?;
        if let Some(data) = cache.get(document_id) {
            return Ok(Some(data.clone()));
        }
    }

    let cover_path = get_cover_path(library_path, document_id);
    if cover_path.exists() {
        let data = fs::read(&cover_path)
            .map_err(|e| format!("Failed to read cover {}: {}", document_id, e))?;

        {
            let mut cache = COVER_CACHE
                .lock()
                .map_err(|e| format!("Cache lock error: {}", e))?;
            cache.put(document_id.to_string(), data.clone());
        }

        return Ok(Some(data));
    }

    let (filename, url, _, _, _, _) = get_basic_info(document_id)?;
    let relative_path = get_lib_path(&url)?;
    let file_path = Path::new(library_path).join(relative_path);
    if !file_path.exists() {
        return Err(format!(
            "Document file not found at: {}",
            file_path.display()
        ));
    }

    let buffer = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path.display(), e))?;

    let file_extension = get_extension(&filename);
    let images: Vec<Vec<u8>> = match file_extension.as_str() {
        "pdf" => PdfExtractor::extract_images(&buffer, Some(1), Some(1)).await,
        "epub" => EpubExtractor::extract_images(&buffer, Some(1), Some(1)).await,
        "djvu" => DjvuExtractor::extract_images(&buffer, Some(1), Some(1)).await,
        _ => Err(format!("Unsupported file extension: '{}'", file_extension)),
    }
    .map_err(|e| format!("Failed to extract cover image: {}", e))?;

    if let Some(cover) = images.first() {
        log::info!(
            "Successfully extracted cover ({} bytes), saving to cache",
            cover.len()
        );
        save_cover(library_path, document_id, cover)?;
        Ok(Some(cover.clone()))
    } else {
        log::warn!(
            "No cover image could be extracted from {} file",
            file_extension
        );
        Ok(None)
    }
}

pub fn save_cover(library_path: &str, document_id: &str, data: &[u8]) -> Result<(), String> {
    let covers_dir = Path::new(library_path).join(".covers");

    if !covers_dir.exists() {
        fs::create_dir_all(&covers_dir)
            .map_err(|e| format!("Failed to create covers directory: {}", e))?;
    }

    let cover_path = covers_dir.join(format!("{}.webp", document_id));
    fs::write(&cover_path, data)
        .map_err(|e| format!("Failed to write cover {}: {}", document_id, e))?;

    Ok(())
}
