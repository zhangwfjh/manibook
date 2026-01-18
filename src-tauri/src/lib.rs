use base64::{engine::general_purpose::STANDARD, Engine as _};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone)]
struct LLMProvider {
    name: String,
    #[serde(rename = "type")]
    r#type: String,
    model: String,
    baseURL: String,
    apiKey: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Jobs {
    metadataExtraction: String,
    imageTextExtraction: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct LLMSettings {
    providers: Vec<LLMProvider>,
    jobs: Jobs,
}

#[derive(Serialize, Deserialize, Clone)]
struct LibraryDocument {
    id: String,
    path: String,
    filename: String,
    url: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct LibraryCategory {
    name: String,
    path: Vec<String>,
    children: Vec<LibraryCategory>,
    documents: Vec<Option<LibraryDocument>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Library {
    name: String,
    path: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct LibrarySettings {
    libraries: Vec<Library>,
    #[serde(default)]
    default_library: Option<String>,
}

#[tauri::command]
fn get_llm_settings() -> Result<LLMSettings, String> {
    let settings_path = Path::new("settings").join("llm.json");
    match fs::read_to_string(&settings_path) {
        Ok(data) => match serde_json::from_str(&data) {
            Ok(settings) => Ok(settings),
            Err(e) => Err(format!("Failed to parse settings: {}", e)),
        },
        Err(_) => Ok(LLMSettings {
            providers: vec![],
            jobs: Jobs {
                metadataExtraction: String::new(),
                imageTextExtraction: String::new(),
            },
        }),
    }
}

#[tauri::command]
fn set_llm_settings(settings: LLMSettings) -> Result<(), String> {
    if !settings.jobs.metadataExtraction.is_empty()
        && !settings
            .providers
            .iter()
            .any(|p| p.name == settings.jobs.metadataExtraction)
    {
        return Err("Invalid metadata extraction provider".to_string());
    }
    if !settings.jobs.imageTextExtraction.is_empty()
        && !settings
            .providers
            .iter()
            .any(|p| p.name == settings.jobs.imageTextExtraction)
    {
        return Err("Invalid image text extraction provider".to_string());
    }

    let settings_path = Path::new("settings").join("llm.json");
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
fn get_default_library() -> Result<Option<String>, String> {
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
fn set_default_library(default_library: String) -> Result<(), String> {
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

#[tauri::command]
fn get_libraries() -> Result<Vec<Library>, String> {
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
fn create_library(name: String, path: String) -> Result<(), String> {
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
        let conn = rusqlite::Connection::open(&db_path)
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

#[tauri::command]
fn get_library_categories(library_name: String) -> Result<Vec<LibraryCategory>, String> {
    let settings_path = Path::new("settings").join("library.json");
    let settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let db_path = Path::new(&library.path).join("db.sqlite");
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

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

    let mut doctype_map: HashMap<String, LibraryCategory> = HashMap::new();

    for (doctype, category, count) in category_data {
        let doctype_category =
            doctype_map
                .entry(doctype.clone())
                .or_insert_with(|| LibraryCategory {
                    name: doctype.clone(),
                    path: vec![doctype.clone()],
                    children: vec![],
                    documents: vec![],
                });

        build_nested_categories(doctype_category, &category, count as usize);
    }

    fn build_nested_categories(parent: &mut LibraryCategory, category_path: &str, count: usize) {
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
                    let new_child = LibraryCategory {
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

    let categories: Vec<LibraryCategory> = doctype_map.into_iter().map(|(_, cat)| cat).collect();

    Ok(categories)
}

#[tauri::command]
fn get_library(library_name: String) -> Result<Library, String> {
    let settings_path = Path::new("settings").join("library.json");
    let settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    settings
        .libraries
        .into_iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())
}

#[tauri::command]
fn rename_library(old_name: String, new_name: String) -> Result<(), String> {
    if old_name.trim().is_empty() || new_name.trim().is_empty() {
        return Err("Library names cannot be empty".to_string());
    }

    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    if settings.libraries.iter().any(|lib| lib.name == new_name) {
        return Err("New library name already exists".to_string());
    }

    let library = settings
        .libraries
        .iter_mut()
        .find(|lib| lib.name == old_name)
        .ok_or_else(|| "Library not found".to_string())?;

    library.name = new_name.trim().to_string();

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
fn archive_library(library_name: String) -> Result<(), String> {
    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    let index = settings
        .libraries
        .iter()
        .position(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    settings.libraries.remove(index);

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
fn move_library(library_name: String, new_path: String) -> Result<(), String> {
    if library_name.trim().is_empty() || new_path.trim().is_empty() {
        return Err("Library name and path cannot be empty".to_string());
    }

    if !new_path.starts_with('/') && !new_path.chars().nth(1).map_or(false, |c| c == ':') {
        return Err("Invalid path format".to_string());
    }

    let settings_path = Path::new("settings").join("library.json");
    let mut settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    let library = settings
        .libraries
        .iter_mut()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let old_path = &library.path;

    if old_path == &new_path {
        return Err("New path is the same as the current path".to_string());
    }

    if Path::new(&new_path).exists() {
        let entries = fs::read_dir(&new_path)
            .map_err(|e| format!("Failed to read target directory: {}", e))?;
        if entries.count() > 0 {
            return Err("Target directory is not empty".to_string());
        }
        fs::remove_dir(&new_path)
            .map_err(|e| format!("Failed to remove target directory: {}", e))?;
    }

    fs::rename(&old_path, &new_path.trim())
        .map_err(|e| format!("Failed to move library directory: {}", e))?;

    library.path = new_path.trim().to_string();

    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let data = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&settings_path, data).map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_document_cover(library_name: String, document_id: String) -> Result<String, String> {
    let settings_path = Path::new("settings").join("library.json");
    let settings: LibrarySettings = match fs::read_to_string(&settings_path) {
        Ok(data) => {
            serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?
        }
        Err(_) => return Err("No settings file found".to_string()),
    };

    let library = settings
        .libraries
        .iter()
        .find(|lib| lib.name == library_name)
        .ok_or_else(|| "Library not found".to_string())?;

    let db_path = Path::new(&library.path).join("db.sqlite");
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT cover FROM documents WHERE id = ?")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let cover_result: Result<Option<Vec<u8>>, rusqlite::Error> =
        stmt.query_row(params![document_id], |row| row.get::<_, Option<Vec<u8>>>(0));

    match cover_result {
        Ok(Some(cover_data)) => {
            let base64 = STANDARD.encode(&cover_data);
            Ok(format!("data:image/webp;base64,{}", base64))
        }
        Ok(None) => Err("Cover not found".to_string()),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err("Document not found".to_string()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_llm_settings,
            set_llm_settings,
            get_default_library,
            set_default_library,
            get_libraries,
            create_library,
            get_library_categories,
            get_library,
            rename_library,
            move_library,
            archive_library,
            get_document_cover
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
