use crate::extractors::{Extractor, ForewordExtraction};
use crate::utils::content::truncate_foreword;
use crate::utils::image::encode_cover_webp;
use epub_parser::Epub;

pub struct EpubExtractor;

impl Extractor for EpubExtractor {
    async fn extract(buffer: &[u8]) -> Result<ForewordExtraction, String> {
        let doc = Epub::parse_from_buffer(buffer)
            .map_err(|e| format!("Failed to parse EPUB: {:?}", e))?;

        let num_pages = doc.pages.len() as i32;

        let mut images: Vec<Vec<u8>> = Vec::new();

        if let Some(ref content) = doc.cover.content {
            if !content.is_empty() {
                match image::load_from_memory(content) {
                    Ok(img) => match encode_cover_webp(&img) {
                        Ok(buffer) => images.push(buffer),
                        Err(e) => {
                            eprintln!("Failed to encode EPUB cover to WebP: {}", e);
                        }
                    },
                    Err(e) => {
                        eprintln!("Failed to load EPUB cover image with image crate: {}", e);
                    }
                }
            }
        }

        let mut foreword = String::new();

        for page in &doc.pages {
            if foreword.len() >= Self::MAX_FOREWORD_LENGTH {
                break;
            }
            foreword.push_str(&page.content);
            foreword.push_str("\n\n");
        }
        truncate_foreword(&mut foreword, Self::MAX_FOREWORD_LENGTH);

        Ok(ForewordExtraction {
            foreword,
            images,
            num_pages,
        })
    }
}
