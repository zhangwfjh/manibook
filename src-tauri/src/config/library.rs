use crate::models::{Library, LibrarySettings};
use std::fs;
use std::path::Path;

#[tauri::command]
pub fn get_libraries() -> Result<Vec<Library>, String> {
    let settings_path = Path::new("settings").join("library.json");
    match fs::read_to_string(&settings_path) {
        Ok(data) => match serde_json::from_str::<LibrarySettings>(&data) {
            Ok(settings) => Ok(settings.libraries),
            Err(e) => Err(format!("Failed to parse settings: {}", e)),
        },
        Err(_) => Ok(vec![]),
    }
}

#[tauri::command]
pub fn get_default_library() -> Result<Option<String>, String> {
    let settings_path = Path::new("settings").join("library.json");
    match fs::read_to_string(&settings_path) {
        Ok(data) => match serde_json::from_str::<LibrarySettings>(&data) {
            Ok(settings) => Ok(settings.default_library),
            Err(e) => Err(format!("Failed to parse settings: {}", e)),
        },
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn set_default_library(default_library: String) -> Result<(), String> {
    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => LibrarySettings {
            libraries: vec![],
            default_library: None,
        },
    };

    settings.default_library = Some(default_library);

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))
}

pub fn get_library_settings() -> Result<LibrarySettings, String> {
    let settings_path = Path::new("settings").join("library.json");
    fs::read_to_string(&settings_path)
        .map_err(|e| {
            format!(
                "Failed to read library settings at {}: {}",
                settings_path.display(),
                e
            )
        })
        .and_then(|data| {
            serde_json::from_str(&data).map_err(|e| {
                format!(
                    "Failed to parse library settings at {}: {}",
                    settings_path.display(),
                    e
                )
            })
        })
}

#[tauri::command]
pub fn create_library(name: String, path: String) -> Result<(), String> {
    if name.trim().is_empty() || path.trim().is_empty() {
        return Err("Name and path are required".to_string());
    }

    if !path.starts_with('/') && !path.chars().nth(1).map_or(false, |c| c == ':') {
        return Err("Invalid path format".to_string());
    }

    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => LibrarySettings {
            libraries: vec![],
            default_library: None,
        },
    };

    if settings.libraries.iter().any(|lib| lib.name == name) {
        return Err("Library name already exists".to_string());
    }

    fs::create_dir_all(&path).map_err(|e| format!("Failed to create library directory: {}", e))?;

    let db_path = Path::new(&path).join("db.sqlite");
    if !db_path.exists() {
        create_database(&db_path)?;
    }

    settings.libraries.push(Library {
        name: name.trim().to_string(),
        path: path.trim().to_string(),
    });

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

fn create_database(db_path: &Path) -> Result<(), String> {
    let conn = rusqlite::Connection::open(db_path)
        .map_err(|e| format!("Failed to create database: {}", e))?;

    conn.execute(
        r#"
        CREATE TABLE "documents" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "filename" TEXT NOT NULL UNIQUE,
            "url" TEXT NOT NULL,
            "doctype" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "authors" TEXT NOT NULL,
            "publicationYear" INTEGER,
            "publisher" TEXT,
            "category" TEXT NOT NULL,
            "language" TEXT,
            "keywords" TEXT NOT NULL,
            "abstract" TEXT,
            "favorite" INTEGER NOT NULL DEFAULT 0,
            "metadata" TEXT,
            "hash" TEXT UNIQUE,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "numPages" INTEGER NOT NULL DEFAULT 0,
            "filesize" INTEGER NOT NULL DEFAULT 0,
            "format" TEXT NOT NULL DEFAULT 'unknown',
            "cover" BLOB
        )
        "#,
        [],
    )
    .map_err(|e| format!("Failed to create documents table: {}", e))?;

    conn.execute(
        r#"
        CREATE TRIGGER update_documents_updated_at
        AFTER UPDATE ON documents
        FOR EACH ROW
        BEGIN
            UPDATE documents SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END
        "#,
        [],
    )
    .map_err(|e| format!("Failed to create update trigger: {}", e))?;

    Ok(())
}
