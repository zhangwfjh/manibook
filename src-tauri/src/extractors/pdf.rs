use crate::extractors::{Extractor, ForewordExtraction};
use crate::utils::content::truncate_foreword;
use crate::utils::image::encode_cover_webp;
use pdfium_render::prelude::*;

pub struct PdfExtractor;

impl Extractor for PdfExtractor {
    async fn extract(buffer: &[u8]) -> Result<ForewordExtraction, String> {
        let pdfium = Pdfium::default();

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

                let webp_buffer = encode_cover_webp(&bitmap)?;
                images.push(webp_buffer);
            }

            let page_text = page.text();
            if let Ok(text) = page_text {
                foreword.push_str(&text.to_string());
                foreword.push_str("\n\n");
                if foreword.len() > Self::MAX_FOREWORD_LENGTH {
                    truncate_foreword(&mut foreword, Self::MAX_FOREWORD_LENGTH);
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
