use crate::models::{
    Category, DbDocument, Document, DocumentList, DocumentQuery, FilterCounts, Metadata,
};
use crate::services::connection_manager::with_connection;
use crate::utils::database::handle_query_result;
use lazy_static::lazy_static;
use lru::LruCache;
use rusqlite::{params, params_from_iter, OpenFlags};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};

lazy_static! {
    pub static ref FILTER_CACHE: Mutex<LruCache<String, (FilterCounts, Instant)>> =
        Mutex::new(LruCache::new(std::num::NonZeroUsize::new(100).unwrap()));
}

pub(crate) fn open_database(library_path: &str) -> Result<rusqlite::Connection, String> {
    let db_path = Path::new(library_path).join("db.sqlite");
    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_FULL_MUTEX;

    rusqlite::Connection::open_with_flags(&db_path, flags)
        .map_err(|e| format!("Failed to open database at {}: {}", db_path.display(), e))
}

pub fn get_basic_info(
    document_id: &str,
) -> Result<(String, String, i32, i64, String, i32), String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT filename, url, numPages, filesize, format, favorite FROM documents WHERE id = ?")
            .map_err(|e| format!("Failed to prepare document query: {}", e))?;

        stmt.query_row(params![document_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i32>(5)?,
            ))
        })
        .map_err(|e| format!("Document '{}' not found in database: {}", document_id, e))
    })
}

pub fn insert_document(
    id: &str,
    filename: &str,
    url: &str,
    metadata: &Metadata,
    hash: &str,
    cover: Option<&Vec<u8>>,
) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "INSERT INTO documents (id, filename, url, doctype, title, authors, publicationYear, publisher, category, language, keywords, abstract, favorite, metadata, hash, numPages, filesize, format, cover) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id,
                filename,
                url,
                &metadata.doctype,
                &metadata.title,
                serde_json::to_string(&metadata.authors).unwrap_or_default(),
                metadata.publication_year,
                &metadata.publisher,
                &metadata.category,
                &metadata.language,
                serde_json::to_string(&metadata.keywords).unwrap_or_default(),
                &metadata.r#abstract,
                &metadata.favorite,
                serde_json::to_string(&metadata.metadata).unwrap_or_default(),
                hash,
                &metadata.num_pages,
                &metadata.filesize,
                &metadata.format,
                cover,
            ],
        )
        .map_err(|e| format!("Failed to insert document into database: {}", e))?;

        Ok(())
    })
}

pub fn update_metadata(document_id: &str, metadata: &Metadata) -> Result<(), String> {
    with_connection(|conn| {
        let now = chrono::Utc::now().to_rfc3339();

        let sql = r#"
            UPDATE documents SET
                title = ?,
                authors = ?,
                publicationYear = ?,
                publisher = ?,
                category = ?,
                language = ?,
                keywords = ?,
                abstract = ?,
                doctype = ?,
                favorite = ?,
                metadata = ?,
                updatedAt = ?
            WHERE id = ?
        "#;

        let params = params![
            metadata.title,
            serde_json::to_string(&metadata.authors).unwrap(),
            metadata.publication_year,
            metadata.publisher,
            metadata.category,
            metadata.language,
            serde_json::to_string(&metadata.keywords).unwrap(),
            metadata.r#abstract,
            metadata.doctype,
            metadata.favorite,
            metadata
                .metadata
                .as_ref()
                .map(|m| serde_json::to_string(m).unwrap()),
            now,
            document_id
        ];

        conn.execute(sql, params)
            .map_err(|e| format!("Failed to update document: {}", e))?;

        Ok(())
    })
}

pub fn update_file_info(document_id: &str, filename: &str, url: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE documents SET filename = ?, url = ? WHERE id = ?",
            params![filename, url, document_id],
        )
        .map_err(|e| format!("Failed to update filename and url: {}", e))?;
        Ok(())
    })
}

pub fn check_exists_by_hash(hash: &str) -> Result<bool, String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT id FROM documents WHERE hash = ?")
            .map_err(|e| format!("Failed to prepare duplicate check query: {}", e))?;

        let exists = stmt.query_row(params![hash], |_| Ok(())).is_ok();
        Ok(exists)
    })
}

pub fn delete_document(document_id: &str) -> Result<String, String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT url FROM documents WHERE id = ?")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let url_result: Result<String, rusqlite::Error> =
            stmt.query_row(params![document_id], |row| row.get::<_, String>(0));

        let url = handle_query_result(url_result, "Document not found")?;

        conn.execute("DELETE FROM documents WHERE id = ?", params![document_id])
            .map_err(|e| format!("Failed to delete document from database: {}", e))?;

        Ok(url)
    })
}

pub fn get_url(document_id: &str) -> Result<String, String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT url FROM documents WHERE id = ?")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let url_result: Result<String, rusqlite::Error> =
            stmt.query_row(params![document_id], |row| row.get::<_, String>(0));

        handle_query_result(url_result, "Document not found")
    })
}

pub fn get_cover(document_id: &str) -> Result<Option<Vec<u8>>, String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT cover FROM documents WHERE id = ?")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let cover_result: Result<Option<Vec<u8>>, rusqlite::Error> =
            stmt.query_row(params![document_id], |row| row.get::<_, Option<Vec<u8>>>(0));

        handle_query_result(cover_result, "Document not found")
    })
}

#[tauri::command]
pub fn get_documents(query: DocumentQuery) -> Result<DocumentList, String> {
    with_connection(|conn| {
        let mut where_clauses = Vec::new();
        let mut params: Vec<String> = Vec::new();

        if let Some(category) = &query.category {
            let category_parts: Vec<&str> = category.split(" > ").collect();
            if !category_parts.is_empty() {
                where_clauses.push("doctype = ?".to_string());
                params.push(category_parts[0].to_string());
                if category_parts.len() > 1 {
                    let category_path = category_parts[1..].join(" > ");
                    where_clauses.push("(category = ? OR category LIKE ?)".to_string());
                    params.push(category_path.clone());
                    params.push(format!("{} > %", category_path));
                }
            }
        }

        if !query.keywords.is_empty() {
            let keyword_conditions: Vec<String> = query
                .keywords
                .iter()
                .map(|_| "keywords LIKE ?".to_string())
                .collect();
            where_clauses.push(format!("({})", keyword_conditions.join(" OR ")));
            for keyword in &query.keywords {
                params.push(format!("%{}%", keyword));
            }
        }

        if !query.formats.is_empty() {
            let placeholders: Vec<&str> = query.formats.iter().map(|_| "?").collect();
            where_clauses.push(format!("format IN ({})", placeholders.join(", ")));
            params.extend(query.formats.iter().map(|f| f.to_lowercase()));
        }

        if !query.authors.is_empty() {
            let author_conditions: Vec<String> = query
                .authors
                .iter()
                .map(|_| "authors LIKE ?".to_string())
                .collect();
            where_clauses.push(format!("({})", author_conditions.join(" OR ")));
            for author in &query.authors {
                params.push(format!("%{}%", author));
            }
        }

        if !query.publishers.is_empty() {
            let placeholders: Vec<&str> = query.publishers.iter().map(|_| "?").collect();
            where_clauses.push(format!("publisher IN ({})", placeholders.join(", ")));
            params.extend(query.publishers.clone());
        }

        if !query.languages.is_empty() {
            let placeholders: Vec<&str> = query.languages.iter().map(|_| "?").collect();
            where_clauses.push(format!("language IN ({})", placeholders.join(", ")));
            params.extend(query.languages.clone());
        }

        if query.favorites_only {
            where_clauses.push("favorite = 1".to_string());
        }

        if let Some(search) = &query.search_query {
            let search_conditions = [
                "title LIKE ?",
                "authors LIKE ?",
                "keywords LIKE ?",
                "publisher LIKE ?",
                "abstract LIKE ?",
            ];
            where_clauses.push(format!("({})", search_conditions.join(" OR ")));
            for _ in 0..5 {
                params.push(format!("%{}%", search));
            }
        }

        let where_clause = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_clauses.join(" AND "))
        };

        let (sort_field, sort_order) = query
            .sort_by
            .split_once('-')
            .unwrap_or(("createdAt", "desc"));
        let order_by = match sort_field {
            "title" => "title",
            "author" => "authors",
            "publisher" => "publisher",
            "publicationYear" => "publicationYear",
            "language" => "language",
            "doctype" => "doctype",
            "numPages" => "numPages",
            "favorite" => "favorite",
            "updatedAt" => "updatedAt",
            "filesize" => "filesize",
            _ => "createdAt",
        };

        let limit = query.limit.min(200);
        let offset = (query.page.saturating_sub(1)) * limit;

        let sql = format!(
        "SELECT id, filename, url, doctype, title, authors, publicationYear, publisher, category, language, keywords, abstract, favorite, numPages, filesize, format, metadata, updatedAt FROM documents {} ORDER BY {} {} LIMIT ? OFFSET ?",
        where_clause, order_by, sort_order
    );
        let mut params_with_pagination = params.clone();
        params_with_pagination.push(limit.to_string());
        params_with_pagination.push(offset.to_string());

        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let documents: Vec<Document> = stmt
            .query_map(params_from_iter(params_with_pagination.iter()), |row| {
                DbDocument::from_row(row)
                    .map(|db_doc| db_doc.into_document())
                    .map_err(|e| rusqlite::Error::InvalidParameterName(e))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let count_sql = format!("SELECT COUNT(*) FROM documents {}", where_clause);
        let total_count: usize = conn
            .query_row(&count_sql, params_from_iter(params.iter()), |row| {
                row.get(0)
            })
            .map_err(|e| format!("Failed to get count: {}", e))?;

        let cache_key = serde_json::to_string(&query).unwrap_or_default();
        let mut cache = FILTER_CACHE.lock().unwrap();
        let filter_options = if let Some((cached, timestamp)) = cache.get(&cache_key) {
            if timestamp.elapsed() < Duration::from_secs(300) {
                cached.clone()
            } else {
                cache.pop(&cache_key);
                compute_filter_counts(conn, &where_clause, &params)?
            }
        } else {
            compute_filter_counts(conn, &where_clause, &params)?
        };

        cache.put(cache_key, (filter_options.clone(), Instant::now()));

        let total_pages = total_count.div_ceil(limit);
        let has_next = query.page < total_pages;
        let has_prev = query.page > 1;

        Ok(DocumentList {
            documents,
            total_count,
            page: query.page,
            limit,
            has_next,
            has_prev,
            filter_options,
        })
    })
}

fn compute_filter_counts(
    conn: &rusqlite::Connection,
    where_clause: &str,
    params: &[String],
) -> Result<FilterCounts, String> {
    let mut filter_options = FilterCounts {
        formats: HashMap::new(),
        keywords: HashMap::new(),
        authors: HashMap::new(),
        publishers: HashMap::new(),
        languages: HashMap::new(),
    };

    let sql = format!(
        "SELECT format, COUNT(*) FROM documents {} GROUP BY format",
        where_clause
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare formats query: {}", e))?;
    let format_iter = stmt
        .query_map(params_from_iter(params.iter()), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as usize))
        })
        .map_err(|e| format!("Failed to execute formats query: {}", e))?;
    for result in format_iter {
        let (format, count) = result.map_err(|e| format!("Failed to get format result: {}", e))?;
        filter_options.formats.insert(format.to_uppercase(), count);
    }

    let sql = if where_clause.is_empty() {
        "SELECT publisher, COUNT(*) FROM documents WHERE publisher IS NOT NULL GROUP BY publisher"
            .to_string()
    } else {
        format!("SELECT publisher, COUNT(*) FROM documents {} AND publisher IS NOT NULL GROUP BY publisher", where_clause)
    };
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare publishers query: {}", e))?;
    let publisher_iter = stmt
        .query_map(params_from_iter(params.iter()), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as usize))
        })
        .map_err(|e| format!("Failed to execute publishers query: {}", e))?;
    for result in publisher_iter {
        let (publisher, count) =
            result.map_err(|e| format!("Failed to get publisher result: {}", e))?;
        filter_options.publishers.insert(publisher, count);
    }

    let sql = if where_clause.is_empty() {
        "SELECT language, COUNT(*) FROM documents WHERE language IS NOT NULL GROUP BY language"
            .to_string()
    } else {
        format!("SELECT language, COUNT(*) FROM documents {} AND language IS NOT NULL GROUP BY language", where_clause)
    };
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare languages query: {}", e))?;
    let language_iter = stmt
        .query_map(params_from_iter(params.iter()), |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as usize))
        })
        .map_err(|e| format!("Failed to execute languages query: {}", e))?;
    for result in language_iter {
        let (language, count) =
            result.map_err(|e| format!("Failed to get language result: {}", e))?;
        filter_options.languages.insert(language, count);
    }

    let sql = format!(
        "SELECT keywords, authors FROM documents {} LIMIT 5000",
        where_clause
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare keywords query: {}", e))?;
    let doc_iter = stmt
        .query_map(params_from_iter(params.iter()), |row| {
            Ok((
                row.get::<_, Option<String>>(0)?,
                row.get::<_, Option<String>>(1)?,
            ))
        })
        .map_err(|e| format!("Failed to execute keywords query: {}", e))?;

    for result in doc_iter {
        let (keywords_json, authors_json) =
            result.map_err(|e| format!("Failed to get doc result: {}", e))?;
        if let Some(kw_json) = keywords_json {
            if let Ok(keywords) = serde_json::from_str::<Vec<String>>(&kw_json) {
                for kw in keywords {
                    let count = filter_options.keywords.entry(kw).or_insert(0);
                    *count += 1;
                }
            }
        }
        if let Some(auth_json) = authors_json {
            if let Ok(authors) = serde_json::from_str::<Vec<String>>(&auth_json) {
                for author in authors {
                    let count = filter_options.authors.entry(author).or_insert(0);
                    *count += 1;
                }
            }
        }
    }

    Ok(filter_options)
}

#[tauri::command]
pub fn get_library_categories() -> Result<Vec<Category>, String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare(
                "SELECT doctype, category, COUNT(*) as count
         FROM documents
         WHERE category IS NOT NULL AND category != ''
         GROUP BY doctype, category
         ORDER BY doctype, category",
            )
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let category_data: Vec<(String, String, i64)> = stmt
            .query_map(params![], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect results: {}", e))?;

        let mut doctype_map: HashMap<String, Category> = HashMap::new();

        for (doctype, category, count) in category_data {
            let doctype_category = doctype_map
                .entry(doctype.clone())
                .or_insert_with(|| Category {
                    name: doctype.clone(),
                    path: vec![doctype.clone()],
                    children: vec![],
                    documents: vec![],
                });

            build_nested_categories(doctype_category, &category, count as usize);
        }

        fn build_nested_categories(parent: &mut Category, category_path: &str, count: usize) {
            let parts: Vec<String> = category_path
                .split('>')
                .map(|s| s.trim().to_string())
                .collect();
            let mut current = parent;

            for (i, part) in parts.iter().enumerate() {
                let child_index = current.children.iter().position(|c| c.name == *part);
                let child_index = match child_index {
                    Some(idx) => idx,
                    None => {
                        let mut child_path = current.path.clone();
                        child_path.push(part.clone());
                        let new_child = Category {
                            name: part.clone(),
                            path: child_path,
                            children: vec![],
                            documents: vec![],
                        };
                        current.children.push(new_child);
                        current.children.len() - 1
                    }
                };

                current = &mut current.children[child_index];

                if i == parts.len() - 1 {
                    current.documents = vec![None; count];
                }
            }
        }

        let categories: Vec<Category> = doctype_map.into_values().collect();

        Ok(categories)
    })
}
