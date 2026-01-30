use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[allow(non_snake_case)]
pub struct LLMProvider {
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub model: String,
    pub baseURL: String,
    pub apiKey: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[allow(non_snake_case)]
pub struct Jobs {
    pub metadataExtraction: String,
    pub imageTextExtraction: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LLMSettings {
    pub providers: Vec<LLMProvider>,
    pub jobs: Jobs,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Metadata {
    pub doctype: String,
    pub title: String,
    pub authors: Vec<String>,
    #[serde(rename = "publicationYear")]
    pub publication_year: Option<i32>,
    pub publisher: Option<String>,
    pub category: String,
    pub language: String,
    pub keywords: Vec<String>,
    pub r#abstract: String,
    pub favorite: bool,
    #[serde(rename = "numPages")]
    pub num_pages: i32,
    pub filesize: i64,
    pub format: String,
    pub metadata: Option<serde_json::Value>,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub url: String,
    pub metadata: Metadata,
    #[serde(rename = "categoryPath")]
    pub category_path: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Category {
    pub name: String,
    pub path: Vec<String>,
    pub children: Vec<Category>,
    pub documents: Vec<Option<Document>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Library {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ImportRequest {
    pub file_data: Option<Vec<FileData>>,
    pub urls: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileData {
    pub filename: String,
    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ImportResult {
    pub success: bool,
    pub filename: Option<String>,
    pub metadata: Option<Metadata>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ImportResponse {
    pub results: Vec<ImportResult>,
    pub errors: Vec<ImportError>,
    pub total_processed: usize,
    pub success_count: usize,
    pub error_count: usize,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ImportError {
    pub source: String,
    pub error: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LibrarySettings {
    pub libraries: Vec<Library>,
    #[serde(default)]
    pub default_library: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DocumentQuery {
    pub page: usize,
    pub limit: usize,
    pub category: Option<String>,
    pub search_query: Option<String>,
    pub keywords: Vec<String>,
    pub formats: Vec<String>,
    pub authors: Vec<String>,
    pub publishers: Vec<String>,
    pub languages: Vec<String>,
    pub favorites_only: bool,
    pub sort_by: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FilterCounts {
    pub formats: std::collections::HashMap<String, usize>,
    pub keywords: std::collections::HashMap<String, usize>,
    pub authors: std::collections::HashMap<String, usize>,
    pub publishers: std::collections::HashMap<String, usize>,
    pub languages: std::collections::HashMap<String, usize>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DocumentListResponse {
    pub documents: Vec<Document>,
    pub total_count: usize,
    pub page: usize,
    pub limit: usize,
    pub has_next: bool,
    pub has_prev: bool,
    pub filter_options: FilterCounts,
}

#[derive(Serialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: serde_json::Value,
}

#[derive(Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub response_format: Option<serde_json::Value>,
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Deserialize)]
pub struct ChatChoice {
    pub message: ChatResponseMessage,
}

#[derive(Deserialize)]
pub struct ChatResponseMessage {
    pub content: String,
}

#[derive(Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<ChatChoice>,
}
