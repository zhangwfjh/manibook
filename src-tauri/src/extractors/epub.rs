use crate::extractors::{Extractor, ForewordExtraction};
use epub::doc::EpubDoc;
use image::ImageFormat;
use std::io::Cursor;

pub struct EpubExtractor;

impl Extractor for EpubExtractor {
    async fn extract(buffer: &[u8]) -> Result<ForewordExtraction, String> {
        let cursor = Cursor::new(buffer);
        let mut doc =
            EpubDoc::from_reader(cursor).map_err(|e| format!("Failed to parse EPUB: {}", e))?;

        let num_pages = doc.get_num_chapters() as i32;

        let mut images: Vec<Vec<u8>> = Vec::new();

        if let Some((cover_data, _)) = doc.get_cover() {
            if !cover_data.is_empty() {
                match image::load_from_memory(&cover_data) {
                    Ok(img) => {
                        let mut webp_buffer = Vec::new();
                        match img.write_to(
                            &mut std::io::Cursor::new(&mut webp_buffer),
                            ImageFormat::WebP,
                        ) {
                            Ok(_) => images.push(webp_buffer),
                            Err(e) => {
                                eprintln!("Failed to encode EPUB cover to WebP: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to load EPUB cover image with image crate: {}", e);
                    }
                }
            }
        }

        let mut foreword = String::new();

        let mut has_more = true;
        while has_more && foreword.len() < Self::MAX_FOREWORD_LENGTH {
            if let Some((content, _)) = doc.get_current_str() {
                foreword.push_str(content.as_str());
                foreword.push_str("\n\n");
            }
            has_more = doc.go_next();
        }
        if foreword.len() > Self::MAX_FOREWORD_LENGTH {
            let mut end = Self::MAX_FOREWORD_LENGTH;
            while end > 0 && !foreword.is_char_boundary(end) {
                end -= 1;
            }
            foreword.truncate(end);
        }

        Ok(ForewordExtraction {
            foreword,
            images,
            num_pages,
        })
    }
}
