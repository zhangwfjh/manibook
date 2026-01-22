use crate::extractors::{Extractor, ForewordExtraction};
use image::ImageFormat;
use pdfium_render::prelude::*;

pub struct PdfExtractor;

impl Extractor for PdfExtractor {
    async fn extract(buffer: &[u8]) -> Result<ForewordExtraction, String> {
        let pdfium = Pdfium::new(
            Pdfium::bind_to_system_library()
                .map_err(|e| format!("Failed to bind PDFium: {}", e))?,
        );

        let document = pdfium
            .load_pdf_from_byte_slice(buffer, None)
            .map_err(|e| format!("Failed to load PDF: {}", e))?;

        let num_pages = document.pages().len();

        let mut foreword = String::new();
        let mut images: Vec<Vec<u8>> = Vec::new();

        let render_config = PdfRenderConfig::new()
            .set_target_width(800)
            .set_maximum_height(1200);

        for i in 0..num_pages {
            let page = document
                .pages()
                .get(i)
                .map_err(|e| format!("Failed to get page {}: {}", i, e))?;

            if i < 5 {
                let bitmap = page
                    .render_with_config(&render_config)
                    .map_err(|e| format!("Failed to render page {}: {}", i, e))?
                    .as_image();

                let mut webp_buffer = Vec::new();
                bitmap
                    .write_to(
                        &mut std::io::Cursor::new(&mut webp_buffer),
                        ImageFormat::WebP,
                    )
                    .map_err(|e| format!("Failed to encode WebP: {}", e))?;

                images.push(webp_buffer);
            }

            let page_text = page.text();
            if let Ok(text) = page_text {
                foreword.push_str(&text.to_string());
                foreword.push_str("\n\n");
                if foreword.len() > Self::MAX_FOREWORD_LENGTH {
                    let mut end = Self::MAX_FOREWORD_LENGTH;
                    while end > 0 && !foreword.is_char_boundary(end) {
                        end -= 1;
                    }
                    foreword.truncate(end);
                    break;
                }
            }
        }

        Ok(ForewordExtraction {
            foreword,
            images,
            num_pages: num_pages.into(),
        })
    }
}
