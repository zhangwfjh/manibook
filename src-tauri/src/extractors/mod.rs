pub mod djvu;
pub mod epub;
pub mod pdf;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ForewordExtraction {
    pub foreword: String,
    pub images: Vec<Vec<u8>>,
    pub page_count: i32,
}

pub trait Extractor {
    async fn extract_text(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<String, String>;
    async fn extract_images(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<Vec<Vec<u8>>, String>;
    async fn extract_metadata(buffer: &[u8]) -> Result<serde_json::Value, String>;
}
