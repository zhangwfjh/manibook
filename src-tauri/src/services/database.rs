use crate::models::document::{
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
    log::debug!("Opening database at: {}", db_path.display());

    let flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_FULL_MUTEX;

    let conn = rusqlite::Connection::open_with_flags(&db_path, flags).map_err(|e| {
        log::error!("Failed to open database at {}: {}", db_path.display(), e);
        format!("Failed to open database at {}: {}", db_path.display(), e)
    })?;

    // Enable WAL mode for concurrent read/write (import while browsing)
    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| format!("Failed to set WAL mode: {}", e))?;
    conn.pragma_update(None, "synchronous", "NORMAL")
        .map_err(|e| format!("Failed to set synchronous mode: {}", e))?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Run schema migrations for new and existing libraries
    crate::services::migrations::run_migrations(&conn)?;

    Ok(conn)
}

pub fn get_basic_info(document_id: &str) -> Result<(String, i32, i64, String, i32), String> {
    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT url, page_count, file_size, file_type, favorite FROM documents WHERE id = ?")
            .map_err(|e| format!("Failed to prepare document query: {}", e))?;

        stmt.query_row(params![document_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i32>(4)?,
            ))
        })
        .map_err(|e| format!("Document '{}' not found in database: {}", document_id, e))
    })
}

pub fn insert_document(id: &str, url: &str, metadata: &Metadata, hash: &str) -> Result<(), String> {
    log::debug!(
        "Inserting document into database: id={}, title='{}'",
        id,
        metadata.title
    );

    with_connection(|conn| {
        conn.execute(
            "INSERT INTO documents (id, url, doctype, title, authors, publication_year, publisher, category, language, keywords, summary, favorite, metadata, hash, page_count, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id,
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
                &metadata.page_count,
                &metadata.filesize,
                &metadata.filetype,
            ],
        )
        .map_err(|e| {
            log::error!("Failed to insert document {}: {}", id, e);
            format!("Failed to insert document into database: {}", e)
        })?;

        log::debug!("Successfully inserted document: {}", id);
        Ok(())
    })
}

pub fn update_metadata(document_id: &str, metadata: &Metadata) -> Result<(), String> {
    with_connection(|conn| {
        let sql = r#"
            UPDATE documents SET
                title = ?,
                authors = ?,
                publication_year = ?,
                publisher = ?,
                category = ?,
                language = ?,
                keywords = ?,
                summary = ?,
                doctype = ?,
                favorite = ?,
                metadata = ?
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
            document_id
        ];

        conn.execute(sql, params)
            .map_err(|e| format!("Failed to update document: {}", e))?;

        Ok(())
    })
}

pub fn update_file_info(document_id: &str, url: &str) -> Result<(), String> {
    with_connection(|conn| {
        conn.execute(
            "UPDATE documents SET url = ? WHERE id = ?",
            params![url, document_id],
        )
        .map_err(|e| format!("Failed to update url: {}", e))?;
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
    log::debug!("Deleting document from database: {}", document_id);

    with_connection(|conn| {
        let mut stmt = conn
            .prepare("SELECT url FROM documents WHERE id = ?")
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let url_result: Result<String, rusqlite::Error> =
            stmt.query_row(params![document_id], |row| row.get::<_, String>(0));

        let url = handle_query_result(url_result, "Document not found")?;

        conn.execute("DELETE FROM documents WHERE id = ?", params![document_id])
            .map_err(|e| {
                log::error!("Failed to delete document {}: {}", document_id, e);
                format!("Failed to delete document from database: {}", e)
            })?;

        log::debug!(
            "Successfully deleted document from database: {}",
            document_id
        );
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

pub fn get_documents(query: DocumentQuery) -> Result<DocumentList, String> {
    log::debug!(
        "Querying documents with filters: category={:?}, keywords={:?}, page={}",
        query.category,
        query.keywords,
        query.page
    );

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
            where_clauses.push(format!("file_type IN ({})", placeholders.join(", ")));
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
            let trimmed = search.trim();
            if !trimmed.is_empty() {
                // Build an FTS5-safe query: keep alphanumeric tokens, prefix-match each.
                let fts_query: String = trimmed
                    .chars()
                    .map(|c| {
                        if c.is_alphanumeric() || c.is_whitespace() {
                            c
                        } else {
                            ' '
                        }
                    })
                    .collect();
                let tokens: Vec<&str> = fts_query
                    .split_whitespace()
                    .filter(|t| !t.is_empty())
                    .collect();

                if tokens.is_empty() {
                    // Pure CJK / non-alphanumeric — unicode61 tokenizer can't help.
                    // Fall back to LIKE so partial CJK matches still work.
                    let search_conditions = [
                        "title LIKE ?",
                        "authors LIKE ?",
                        "keywords LIKE ?",
                        "publisher LIKE ?",
                        "summary LIKE ?",
                    ];
                    where_clauses.push(format!("({})", search_conditions.join(" OR ")));
                    for _ in 0..5 {
                        params.push(format!("%{}%", trimmed));
                    }
                } else {
                    // FTS5 MATCH for tokenized languages (English, etc.)
                    let fts_expr = tokens
                        .iter()
                        .map(|t| format!("{}*", t))
                        .collect::<Vec<_>>()
                        .join(" OR ");
                    where_clauses.push(format!(
                        "documents.rowid IN (SELECT rowid FROM documents_fts WHERE documents_fts MATCH ?)"
                    ));
                    params.push(fts_expr);
                }
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
            .unwrap_or(("created_at", "desc"));
        let order_by = match sort_field {
            "title" => "title",
            "author" => "authors",
            "publisher" => "publisher",
            "publication_year" => "publication_year",
            "language" => "language",
            "doctype" => "doctype",
            "page_count" => "page_count",
            "favorite" => "favorite",
            "createdAt" => "created_at",
            "filesize" => "file_size",
            _ => "created_at",
        };
        // Validate sort direction — never interpolate user input raw into SQL
        let direction = match sort_order.to_lowercase().as_str() {
            "asc" => "ASC",
            _ => "DESC",
        };

        let limit = query.limit.min(200);
        let offset = (query.page.saturating_sub(1)) * limit;

        let sql = format!(
        "SELECT id, url, doctype, title, authors, publication_year, publisher, category, language, keywords, summary, favorite, page_count, file_size, file_type, metadata FROM documents {} ORDER BY {} {} LIMIT ? OFFSET ?",
        where_clause, order_by, direction
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

        log::debug!(
            "Query returned {} documents (total: {})",
            documents.len(),
            total_count
        );

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
        "SELECT file_type, COUNT(*) FROM documents {} GROUP BY file_type",
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
        let (file_type, count) =
            result.map_err(|e| format!("Failed to get format result: {}", e))?;
        filter_options
            .formats
            .insert(file_type.to_uppercase(), count);
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

/// Find likely duplicates by normalized title+author similarity.
/// Returns groups of document IDs that share a fuzzy-normalized title key.
pub fn find_duplicates() -> Result<Vec<Vec<Document>>, String> {
    use std::collections::HashMap;

    with_connection(|conn| {
        let mut stmt = conn
            .prepare(
                "SELECT id, url, doctype, title, authors, publication_year, publisher,
                        category, language, keywords, summary, favorite, page_count,
                        file_size, file_type, metadata
                 FROM documents ORDER BY title",
            )
            .map_err(|e| format!("Failed to prepare duplicates query: {}", e))?;

        let docs: Vec<Document> = stmt
            .query_map([], |row| {
                DbDocument::from_row(row)
                    .map(|db_doc| db_doc.into_document())
                    .map_err(|e| rusqlite::Error::InvalidParameterName(e))
            })
            .map_err(|e| format!("Failed to query documents: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect documents: {}", e))?;

        // Group by normalized title (lowercase, alphanumeric only, trimmed)
        let mut groups: HashMap<String, Vec<Document>> = HashMap::new();
        for doc in docs {
            let key = normalize_title(&doc.metadata.title);
            if key.len() >= 3 {
                groups.entry(key).or_default().push(doc);
            }
        }

        // Only return groups with >1 member
        let duplicates: Vec<Vec<Document>> = groups.into_values().filter(|g| g.len() > 1).collect();

        Ok(duplicates)
    })
}

/// Normalize a title for fuzzy comparison.
fn normalize_title(title: &str) -> String {
    title
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Library statistics for the dashboard.
#[derive(serde::Serialize)]
pub struct LibraryStats {
    pub total_documents: usize,
    pub total_pages: i64,
    pub total_size_bytes: i64,
    pub by_doctype: std::collections::HashMap<String, usize>,
    pub by_language: std::collections::HashMap<String, usize>,
    pub by_format: std::collections::HashMap<String, usize>,
    pub by_year: std::collections::HashMap<i32, usize>,
}

/// Compute aggregate library statistics.
pub fn get_library_stats() -> Result<LibraryStats, String> {
    with_connection(|conn| {
        let total_documents: usize = conn
            .query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
            .map_err(|e| format!("Failed to count documents: {}", e))?;

        let total_pages: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(page_count), 0) FROM documents",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to sum pages: {}", e))?;

        let total_size_bytes: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(file_size), 0) FROM documents",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to sum file size: {}", e))?;

        let by_doctype = group_count(conn, "doctype")?;
        let by_language = group_count(conn, "language")?;
        let by_format = group_count(conn, "file_type")?;
        let by_year = group_count_year(conn)?;

        Ok(LibraryStats {
            total_documents,
            total_pages,
            total_size_bytes,
            by_doctype,
            by_language,
            by_format,
            by_year,
        })
    })
}

fn group_count(
    conn: &rusqlite::Connection,
    column: &str,
) -> Result<std::collections::HashMap<String, usize>, String> {
    let sql = format!(
        "SELECT {} AS k, COUNT(*) AS c FROM documents GROUP BY {} ORDER BY c DESC",
        column, column
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare group query: {}", e))?;
    let map: std::collections::HashMap<String, usize> = stmt
        .query_map([], |row| {
            let k: String = row.get::<_, Option<String>>(0)?.unwrap_or_default();
            let c: usize = row.get(1)?;
            Ok((k, c))
        })
        .map_err(|e| format!("Failed to query groups: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}

fn group_count_year(
    conn: &rusqlite::Connection,
) -> Result<std::collections::HashMap<i32, usize>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT publication_year AS k, COUNT(*) AS c FROM documents
             WHERE publication_year IS NOT NULL GROUP BY publication_year ORDER BY k DESC",
        )
        .map_err(|e| format!("Failed to prepare year query: {}", e))?;
    let map: std::collections::HashMap<i32, usize> = stmt
        .query_map([], |row| {
            let k: i32 = row.get::<_, Option<i32>>(0)?.unwrap_or(0);
            let c: usize = row.get(1)?;
            Ok((k, c))
        })
        .map_err(|e| format!("Failed to query years: {}", e))?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}
