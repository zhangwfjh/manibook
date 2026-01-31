use crate::models::{Library, LibrarySettings};
use crate::utils::settings::{read_json_file_with_default, write_json_file};
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_libraries(app: AppHandle) -> Result<Vec<Library>, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    let settings_path = config_dir.join("library.json");
    match fs::read_to_string(&settings_path) {
        Ok(data) => match serde_json::from_str::<LibrarySettings>(&data) {
            Ok(settings) => Ok(settings.libraries),
            Err(e) => Err(format!("Failed to parse settings: {}", e)),
        },
        Err(_) => Ok(vec![]),
    }
}

pub fn get_library_settings(app: &AppHandle) -> Result<LibrarySettings, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    let settings_path = config_dir.join("library.json");
    read_json_file_with_default(
        &settings_path,
        LibrarySettings {
            libraries: vec![],
            default_library: None,
        },
    )
}

#[tauri::command]
pub fn create_library(app: AppHandle, name: String, path: String) -> Result<(), String> {
    if name.trim().is_empty() || path.trim().is_empty() {
        return Err("Name and path are required".to_string());
    }

    if !path.starts_with('/') && path.chars().nth(1) != Some(':') {
        return Err("Invalid path format".to_string());
    }

    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get app config dir: {}", e))?;
    let settings_path = config_dir.join("library.json");
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

    let db_path = Path::new(&path).join("db.sqlite");

    if !db_path.exists() {
        let is_empty = Path::new(&path)
            .read_dir()
            .map_err(|e| format!("Failed to read directory: {}", e))?
            .next()
            .is_none();

        if !is_empty {
            return Err("Folder must be empty or contain a valid library database".to_string());
        }
    }

    fs::create_dir_all(&path).map_err(|e| format!("Failed to create library directory: {}", e))?;

    if !db_path.exists() {
        create_database(&db_path)?;
    }

    settings.libraries.push(Library {
        name: name.trim().to_string(),
        path: path.trim().to_string(),
    });

    write_json_file(&settings_path, &settings)?;

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
