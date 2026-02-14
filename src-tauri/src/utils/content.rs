use crate::extractors::{djvu::DjvuExtractor, epub::EpubExtractor, pdf::PdfExtractor, Extractor};
use crate::models::document::Metadata;
use crate::models::llm::LLMSettings;
use crate::services::llm::{extract_metadata_from_text, extract_text_from_images, resolve_model};

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

pub async fn extract_text_with_ocr(
    buffer: &[u8],
    extension: &str,
    page_range: Option<(i32, i32)>,
    foreword: &str,
    llm_settings: &LLMSettings,
) -> Result<String, String> {
    let images: Vec<Vec<u8>> = match extension {
        "pdf" => {
            PdfExtractor::extract_images(buffer, page_range.map(|r| r.0), page_range.map(|r| r.1))
                .await
        }
        "epub" => {
            EpubExtractor::extract_images(buffer, page_range.map(|r| r.0), page_range.map(|r| r.1))
                .await
        }
        "djvu" => {
            DjvuExtractor::extract_images(buffer, page_range.map(|r| r.0), page_range.map(|r| r.1))
                .await
        }
        _ => Err(format!("Unsupported file extension: '{}'", extension)),
    }
    .map_err(|e| format!("Failed to extract images: {}", e))?;

    if images.is_empty() || foreword.len() >= 100 {
        return Ok(foreword.to_string());
    }

    let model_id = &llm_settings.jobs.image_text_extraction;
    if model_id.is_empty() {
        return Err("Image text extraction model not configured".to_string());
    }

    let model = resolve_model(model_id, &llm_settings.api_keys)
        .await
        .map_err(|e| format!("Failed to resolve image model: {}", e))?;

    extract_text_from_images(&images, &model).await
}

pub async fn extract_metadata(
    foreword: &str,
    llm_settings: &LLMSettings,
) -> Result<Metadata, String> {
    let model_id = &llm_settings.jobs.metadata_extraction;
    if model_id.is_empty() {
        return Err("Metadata extraction model not configured".to_string());
    }

    let model = resolve_model(model_id, &llm_settings.api_keys)
        .await
        .map_err(|e| format!("Failed to resolve metadata model: {}", e))?;

    extract_metadata_from_text(foreword, &model).await
}

pub async fn extract_document_content(
    buffer: &[u8],
    extension: &str,
    page_range: Option<(i32, i32)>,
    llm_settings: &LLMSettings,
) -> Result<Metadata, String> {
    let foreword: String = match extension {
        "pdf" => {
            PdfExtractor::extract_text(buffer, page_range.map(|r| r.0), page_range.map(|r| r.1))
                .await
        }
        "epub" => {
            EpubExtractor::extract_text(buffer, page_range.map(|r| r.0), page_range.map(|r| r.1))
                .await
        }
        "djvu" => {
            DjvuExtractor::extract_text(buffer, page_range.map(|r| r.0), page_range.map(|r| r.1))
                .await
        }
        _ => Err(format!("Unsupported file extension: '{}'", extension)),
    }
    .map_err(|e| format!("Failed to extract foreword: {}", e))?;

    let metadata_json = match extension {
        "pdf" => PdfExtractor::extract_metadata(buffer).await,
        "epub" => EpubExtractor::extract_metadata(buffer).await,
        "djvu" => DjvuExtractor::extract_metadata(buffer).await,
        _ => Err(format!("Unsupported file extension: '{}'", extension)),
    }
    .map_err(|e| format!("Failed to extract metadata: {}", e))?;

    let page_count = metadata_json
        .get("page_count")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;

    let mut foreword =
        extract_text_with_ocr(buffer, extension, page_range, &foreword, llm_settings)
            .await
            .map_err(|e| format!("Failed to extract text from images: {}", e))?;

    truncate_foreword(&mut foreword, 5000);

    let mut metadata = extract_metadata(&foreword, llm_settings)
        .await
        .map_err(|e| format!("Failed to extract metadata: {}", e))?;

    metadata.page_count = page_count;

    Ok(metadata)
}
