use crate::extractors::Extractor;
use crate::utils::image::encode_cover_webp;
use pdfium_render::prelude::*;
use std::sync::OnceLock;

const RENDER_TARGET_WIDTH: i32 = 800;
const RENDER_MAX_HEIGHT: i32 = 1200;

static PDFIUM: OnceLock<Pdfium> = OnceLock::new();

pub fn init_pdfium(resource_dir: &std::path::Path) -> Result<(), String> {
    log::info!("Initializing PDFium from resource directory: {}", resource_dir.display());

    let library_name = Pdfium::pdfium_platform_library_name_at_path(resource_dir);

    let bindings = Pdfium::bind_to_library(&library_name)
        .map_err(|e| {
            log::error!("Failed to bind to PDFium library at {}: {}", library_name.display(), e);
            format!("Failed to bind to PDFium library at {}: {}", library_name.display(), e)
        })?;

    let pdfium = Pdfium::new(bindings);

    PDFIUM.set(pdfium)
        .map_err(|_| {
            log::error!("PDFium already initialized");
            "PDFium already initialized".to_string()
        })?;

    log::info!("PDFium initialized successfully at: {}", library_name.display());
    Ok(())
}

fn pdfium() -> &'static Pdfium {
    PDFIUM.get().expect("PDFium not initialized. Call init_pdfium() during app setup first.")
}

pub struct PdfExtractor;

impl PdfExtractor {
    fn get_render_config() -> PdfRenderConfig {
        PdfRenderConfig::new()
            .set_target_width(RENDER_TARGET_WIDTH)
            .set_maximum_height(RENDER_MAX_HEIGHT)
    }

    fn parse_range(from: Option<i32>, length: Option<i32>, max: i32) -> (usize, usize) {
        let from = from.unwrap_or(1).max(1);
        let length = length.unwrap_or(max);
        let start_idx = (from - 1).max(0) as usize;
        let end_idx = (start_idx as i32 + length).min(max) as usize;
        (start_idx, end_idx)
    }

    fn get_page_text(page: &PdfPage) -> Option<String> {
        page.text().ok().map(|text| text.to_string())
    }

    fn render_page(page: &PdfPage, config: &PdfRenderConfig) -> Option<Vec<u8>> {
        page.render_with_config(config)
            .ok()
            .and_then(|bitmap| encode_cover_webp(&bitmap.as_image()).ok())
    }
}

impl Extractor for PdfExtractor {
    async fn extract_text(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<String, String> {
        let document = pdfium()
            .load_pdf_from_byte_slice(buffer, None)
            .map_err(|e| format!("Failed to load PDF: {}", e))?;

        let page_count = document.pages().len() as i32;
        let (start_idx, end_idx) = Self::parse_range(from, length, page_count);

        let mut text = String::new();
        for i in start_idx..end_idx {
            let page = document
                .pages()
                .get(i as u16)
                .map_err(|e| format!("Failed to get page {}: {}", i, e))?;

            if let Some(page_content) = Self::get_page_text(&page) {
                text.push_str(&page_content);
                text.push_str("\n\n");
            }
        }

        Ok(text)
    }

    async fn extract_images(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<Vec<Vec<u8>>, String> {
        let document = pdfium()
            .load_pdf_from_byte_slice(buffer, None)
            .map_err(|e| format!("Failed to load PDF: {}", e))?;

        let page_count = document.pages().len() as i32;
        let (start_idx, end_idx) = Self::parse_range(from, length, page_count);
        let render_config = Self::get_render_config();

        let mut images: Vec<Vec<u8>> = Vec::new();
        for i in start_idx..end_idx {
            let page = document
                .pages()
                .get(i as u16)
                .map_err(|e| format!("Failed to get page {}: {}", i, e))?;

            if let Some(webp_buffer) = Self::render_page(&page, &render_config) {
                images.push(webp_buffer);
            }
        }

        Ok(images)
    }

    async fn extract_metadata(buffer: &[u8]) -> Result<serde_json::Value, String> {
        let document = pdfium()
            .load_pdf_from_byte_slice(buffer, None)
            .map_err(|e| format!("Failed to load PDF: {}", e))?;

        let page_count = document.pages().len() as i32;
        let mut metadata = serde_json::Map::new();
        metadata.insert(
            "page_count".to_string(),
            serde_json::Value::Number(serde_json::Number::from(page_count)),
        );

        Ok(serde_json::Value::Object(metadata))
    }
}
