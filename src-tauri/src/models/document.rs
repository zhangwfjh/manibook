use serde::{Deserialize, Serialize};
use serde_rusqlite::from_row;

/// Raw database row representation for automatic deserialization
#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct DbDocument {
    pub id: String,
    pub url: String,
    pub doctype: String,
    pub title: String,
    pub authors: String,
    pub publicationYear: Option<i32>,
    pub publisher: Option<String>,
    pub category: String,
    pub language: String,
    pub keywords: String,
    pub r#abstract: Option<String>,
    pub favorite: i64,
    pub numPages: i32,
    pub filesize: i64,
    pub format: String,
    pub metadata: Option<String>,
    pub updatedAt: String,
}

impl DbDocument {
    pub fn from_row(row: &rusqlite::Row) -> Result<Self, String> {
        from_row(row).map_err(|e| format!("Failed to deserialize row: {}", e))
    }

    pub fn into_document(self) -> Document {
        Document {
            id: self.id,
            url: self.url,
            metadata: Metadata {
                doctype: self.doctype,
                title: self.title,
                authors: serde_json::from_str(&self.authors).unwrap_or_default(),
                publication_year: self.publicationYear,
                publisher: self.publisher,
                category: self.category,
                language: self.language,
                keywords: serde_json::from_str(&self.keywords).unwrap_or_default(),
                r#abstract: self.r#abstract.unwrap_or_default(),
                favorite: self.favorite != 0,
                num_pages: self.numPages,
                filesize: self.filesize,
                format: self.format,
                metadata: self
                    .metadata
                    .and_then(|m| serde_json::from_str::<serde_json::Value>(&m).ok()),
                updated_at: self.updatedAt,
            },
            category_path: vec![],
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[allow(non_snake_case)]
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
pub struct DocumentList {
    pub documents: Vec<Document>,
    pub total_count: usize,
    pub page: usize,
    pub limit: usize,
    pub has_next: bool,
    pub has_prev: bool,
    pub filter_options: FilterCounts,
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
