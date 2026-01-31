use crate::extractors::{Extractor, ForewordExtraction};
use crate::models::{LLMSettings, Metadata};
use crate::services::llm::{extract_metadata_from_text, extract_text_from_images, find_provider};

pub fn get_extension(filename: &str) -> String {
    std::path::Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase()
}

pub fn truncate_foreword(foreword: &mut String, max_length: usize) {
    if foreword.len() > max_length {
        let mut end = max_length;
        while end > 0 && !foreword.is_char_boundary(end) {
            end -= 1;
        }
        foreword.truncate(end);
    }
}

pub async fn extract_content(buffer: &[u8], extension: &str) -> Result<ForewordExtraction, String> {
    match extension {
        "pdf" => crate::extractors::pdf::PdfExtractor::extract(buffer).await,
        "epub" => crate::extractors::epub::EpubExtractor::extract(buffer).await,
        "djvu" => crate::extractors::djvu::DjvuExtractor::extract(buffer).await,
        _ => Err(format!(
            "Unsupported file extension: '{}'. Supported extensions: pdf, epub, djvu",
            extension
        )),
    }
}

pub async fn extract_text_from_images_if_needed(
    foreword: &str,
    images: &[Vec<u8>],
    llm_settings: &LLMSettings,
) -> Result<String, String> {
    if images.is_empty() || foreword.len() >= 100 {
        return Ok(foreword.to_string());
    }

    let image_provider_name = &llm_settings.jobs.imageTextExtraction;
    if image_provider_name.is_empty() {
        return Err("Image text extraction provider not configured in LLM settings (llm.json > jobs.imageTextExtraction)".to_string());
    }

    let image_provider = find_provider(&llm_settings.providers, image_provider_name)?;
    extract_text_from_images(images, image_provider).await
}

pub async fn extract_metadata(
    foreword: &str,
    llm_settings: &LLMSettings,
) -> Result<Metadata, String> {
    let metadata_provider_name = &llm_settings.jobs.metadataExtraction;
    if metadata_provider_name.is_empty() {
        return Err("Metadata extraction provider not configured in LLM settings (llm.json > jobs.metadataExtraction)".to_string());
    }

    let metadata_provider = find_provider(&llm_settings.providers, metadata_provider_name)?;
    extract_metadata_from_text(foreword, metadata_provider).await
}
