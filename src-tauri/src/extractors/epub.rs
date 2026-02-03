use crate::extractors::Extractor;
use crate::utils::image::encode_cover_webp;
use epub_parser::Epub;

pub struct EpubExtractor;

impl EpubExtractor {
    fn parse_epub(buffer: &[u8]) -> Result<Epub, String> {
        Epub::parse_from_buffer(buffer).map_err(|e| format!("Failed to parse EPUB: {:?}", e))
    }

    fn parse_range(from: Option<i32>, length: Option<i32>, max: i32) -> (usize, usize) {
        let from = from.unwrap_or(1).max(1);
        let length = length.unwrap_or(max);
        let start_idx = (from - 1).max(0) as usize;
        let end_idx = (start_idx as i32 + length).min(max) as usize;
        (start_idx, end_idx)
    }

    fn encode_image(content: &[u8]) -> Option<Vec<u8>> {
        image::load_from_memory(content)
            .ok()
            .and_then(|img| encode_cover_webp(&img).ok())
    }
}

impl Extractor for EpubExtractor {
    async fn extract_text(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<String, String> {
        let doc = Self::parse_epub(buffer)?;
        let page_count = doc.pages.len() as i32;
        let (start_idx, end_idx) = Self::parse_range(from, length, page_count);

        let text = doc.pages[start_idx..end_idx]
            .iter()
            .map(|page| page.content.clone())
            .collect::<Vec<_>>()
            .join("\n\n");

        Ok(text)
    }

    async fn extract_images(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<Vec<Vec<u8>>, String> {
        let doc = Self::parse_epub(buffer)?;
        let num_images = doc.images.len() as i32;
        let (start_idx, end_idx) = Self::parse_range(from, length, num_images);

        let images: Vec<Vec<u8>> = doc.images[start_idx..end_idx]
            .iter()
            .filter_map(|image| Self::encode_image(&image.content))
            .collect();

        Ok(images)
    }

    async fn extract_metadata(buffer: &[u8]) -> Result<serde_json::Value, String> {
        let doc = Self::parse_epub(buffer)?;
        let page_count = doc.pages.len() as i32;

        let mut metadata = serde_json::Map::new();
        let epub_metadata = &doc.metadata;
        if let Some(ref title) = epub_metadata.title {
            if !title.is_empty() {
                metadata.insert(
                    "title".to_string(),
                    serde_json::Value::String(title.clone()),
                );
            }
        }

        if let Some(ref author) = epub_metadata.author {
            if !author.is_empty() {
                metadata.insert(
                    "author".to_string(),
                    serde_json::Value::String(author.clone()),
                );
            }
        }

        if let Some(ref publisher) = epub_metadata.publisher {
            if !publisher.is_empty() {
                metadata.insert(
                    "publisher".to_string(),
                    serde_json::Value::String(publisher.clone()),
                );
            }
        }

        if let Some(ref date) = epub_metadata.date {
            if !date.is_empty() {
                metadata.insert(
                    "publication_date".to_string(),
                    serde_json::Value::String(date.clone()),
                );
            }
        }

        if let Some(ref language) = epub_metadata.language {
            if !language.is_empty() {
                metadata.insert(
                    "language".to_string(),
                    serde_json::Value::String(language.clone()),
                );
            }
        }

        if let Some(ref identifier) = epub_metadata.identifier {
            if !identifier.is_empty() {
                metadata.insert(
                    "identifier".to_string(),
                    serde_json::Value::String(identifier.clone()),
                );
            }
        }

        metadata.insert(
            "page_count".to_string(),
            serde_json::Value::Number(serde_json::Number::from(page_count)),
        );

        Ok(serde_json::Value::Object(metadata))
    }
}
