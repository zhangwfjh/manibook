use crate::diesel::schema::documents;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Queryable, Identifiable, Serialize, Deserialize)]
#[diesel(table_name = documents)]
pub struct DieselDocument {
    pub id: String,
    pub filename: String,
    pub url: String,
    pub doctype: String,
    pub title: String,
    pub authors: String,
    pub publication_year: Option<i32>,
    pub publisher: Option<String>,
    pub category: String,
    pub language: String,
    pub keywords: String,
    pub abstract_field: String,
    pub favorite: i32,
    pub metadata: Option<String>,
    pub hash: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
    pub num_pages: i32,
    pub filesize: i64,
    pub format: String,
    pub cover: Option<Vec<u8>>,
}

#[derive(Debug, Insertable)]
#[diesel(table_name = documents)]
pub struct NewDieselDocument {
    pub id: String,
    pub filename: String,
    pub url: String,
    pub doctype: String,
    pub title: String,
    pub authors: String,
    pub publication_year: Option<i32>,
    pub publisher: Option<String>,
    pub category: String,
    pub language: String,
    pub keywords: String,
    pub abstract_field: String,
    pub favorite: i32,
    pub metadata: Option<String>,
    pub hash: String,
    pub created_at: chrono::NaiveDateTime,
    pub updated_at: chrono::NaiveDateTime,
    pub num_pages: i32,
    pub filesize: i64,
    pub format: String,
    pub cover: Option<Vec<u8>>,
}

impl NewDieselDocument {
    pub fn new(
        id: String,
        filename: String,
        url: String,
        doctype: String,
        title: String,
        authors: String,
        publication_year: Option<i32>,
        publisher: Option<String>,
        category: String,
        language: String,
        keywords: String,
        abstract_field: String,
        favorite: bool,
        metadata: Option<String>,
        hash: String,
        num_pages: i32,
        filesize: i64,
        format: String,
        cover: Option<Vec<u8>>,
    ) -> Self {
        let now = chrono::Utc::now().naive_utc();
        Self {
            id,
            filename,
            url,
            doctype,
            title,
            authors,
            publication_year,
            publisher,
            category,
            language,
            keywords,
            abstract_field,
            favorite: if favorite { 1 } else { 0 },
            metadata,
            hash,
            created_at: now,
            updated_at: now,
            num_pages,
            filesize,
            format,
            cover,
        }
    }
}
