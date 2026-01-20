pub mod djvu;
pub mod epub;
pub mod pdf;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct ForewordExtraction {
    pub foreword: String,
    pub images: Vec<Vec<u8>>,
    pub num_pages: i32,
}

pub trait Extractor {
    async fn extract(buffer: &[u8]) -> Result<ForewordExtraction, String>;
    const MAX_FOREWORD_LENGTH: usize = 5000;
}
