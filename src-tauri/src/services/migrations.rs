use rusqlite::Connection;

/// Run all schema migrations on the given connection.
///
/// Idempotent — safe to call on every library open.
pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    // ── FTS5 full-text search index (metadata fields only) ───────────
    conn.execute(
        r#"CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts
           USING fts5(
               title, authors, keywords, publisher, summary,
               content='documents', content_rowid='rowid',
               tokenize='unicode61'
           )"#,
        [],
    )
    .map_err(|e| format!("Failed to create FTS5 table: {}", e))?;

    // Triggers keep the FTS index in sync with the documents table.
    conn.execute_batch(
        r#"
        CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
            INSERT INTO documents_fts(rowid, title, authors, keywords, publisher, summary)
            VALUES (new.rowid, new.title, new.authors, new.keywords, new.publisher, COALESCE(new.summary, ''));
        END;
        CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, title, authors, keywords, publisher, summary)
            VALUES ('delete', old.rowid, old.title, old.authors, old.keywords, old.publisher, COALESCE(old.summary, ''));
        END;
        CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, title, authors, keywords, publisher, summary)
            VALUES ('delete', old.rowid, old.title, old.authors, old.keywords, old.publisher, COALESCE(old.summary, ''));
            INSERT INTO documents_fts(rowid, title, authors, keywords, publisher, summary)
            VALUES (new.rowid, new.title, new.authors, new.keywords, new.publisher, COALESCE(new.summary, ''));
        END;
        "#,
    )
    .map_err(|e| format!("Failed to create FTS5 triggers: {}", e))?;

    // Backfill FTS for pre-existing rows.
    conn.execute_batch(
        r#"
        INSERT OR IGNORE INTO documents_fts(rowid, title, authors, keywords, publisher, summary)
        SELECT rowid, title, authors, keywords, publisher, COALESCE(summary, '')
        FROM documents
        WHERE rowid NOT IN (SELECT rowid FROM documents_fts);
        "#,
    )
    .map_err(|e| format!("Failed to backfill FTS index: {}", e))?;

    log::debug!("All migrations applied successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            r#"CREATE TABLE documents (
                id TEXT NOT NULL PRIMARY KEY,
                url TEXT NOT NULL,
                doctype TEXT NOT NULL,
                title TEXT NOT NULL,
                authors TEXT NOT NULL,
                publication_year INTEGER,
                publisher TEXT,
                category TEXT NOT NULL,
                language TEXT,
                keywords TEXT NOT NULL,
                summary TEXT,
                favorite INTEGER NOT NULL DEFAULT 0,
                metadata TEXT,
                hash TEXT UNIQUE,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                page_count INTEGER NOT NULL DEFAULT 0,
                file_size INTEGER NOT NULL DEFAULT 0,
                file_type TEXT NOT NULL DEFAULT 'unknown'
            )"#,
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_migrations_create_fts() {
        let conn = in_memory_db();
        run_migrations(&conn).expect("migrations should succeed");
    }

    #[test]
    fn test_migrations_idempotent() {
        let conn = in_memory_db();
        run_migrations(&conn).expect("first run");
        run_migrations(&conn).expect("second run should be idempotent");
    }

    #[test]
    fn test_fts_search_works() {
        let conn = in_memory_db();
        run_migrations(&conn).expect("migrations");

        conn.execute(
            "INSERT INTO documents (id, url, doctype, title, authors, category, keywords, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params!["d1", "/x.pdf", "Book", "Deep Learning", "[\"Ian Goodfellow\"]", "CS > AI", "[\"neural networks\"]", "Comprehensive intro to deep learning"],
        )
        .unwrap();

        let mut stmt = conn
            .prepare("SELECT d.title FROM documents_fts f JOIN documents d ON d.rowid = f.rowid WHERE documents_fts MATCH ?")
            .unwrap();
        let titles: Vec<String> = stmt
            .query_map(["deep"], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(titles.contains(&"Deep Learning".to_string()));
    }
}
