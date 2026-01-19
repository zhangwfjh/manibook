use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;

fn to_proper_title_case(s: &str) -> String {
    if s.is_empty() {
        return s.to_string();
    }

    let small_words: std::collections::HashSet<&str> = [
        "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "in", "of",
    ]
    .into();

    s.to_lowercase()
        .split_whitespace()
        .enumerate()
        .map(|(index, word)| {
            let is_first_or_last = index == 0 || index == s.split_whitespace().count() - 1;
            let is_small_word = small_words.contains(word);
            let is_hyphenated = word.contains('-');

            if is_hyphenated {
                word.split('-')
                    .enumerate()
                    .map(|(i, part)| {
                        let parts: Vec<&str> = word.split('-').collect();
                        let is_first_or_last_part = i == 0 || i == parts.len() - 1;
                        let is_small_part = small_words.contains(part);

                        if is_first_or_last_part || !is_small_part {
                            if let Some(first_char) = part.chars().next() {
                                let rest = part.chars().skip(1).collect::<String>();
                                first_char.to_uppercase().collect::<String>() + &rest
                            } else {
                                part.to_string()
                            }
                        } else {
                            part.to_string()
                        }
                    })
                    .collect::<Vec<String>>()
                    .join("-")
            } else if is_first_or_last || !is_small_word {
                if let Some(first_char) = word.chars().next() {
                    let rest = word.chars().skip(1).collect::<String>();
                    first_char.to_uppercase().collect::<String>() + &rest
                } else {
                    word.to_string()
                }
            } else {
                word.to_string()
            }
        })
        .collect::<Vec<String>>()
        .join(" ")
}

fn normalize_metadata(mut metadata: DocumentMetadata) -> DocumentMetadata {
    metadata.doctype = to_proper_title_case(&metadata.doctype);
    metadata.title = to_proper_title_case(&metadata.title);
    metadata.authors = metadata
        .authors
        .into_iter()
        .map(|author| to_proper_title_case(&author))
        .collect();
    if let Some(publisher) = metadata.publisher {
        metadata.publisher = Some(to_proper_title_case(&publisher));
    }
    metadata.category = metadata
        .category
        .split(" > ")
        .map(|part| to_proper_title_case(part.trim()))
        .collect::<Vec<String>>()
        .join(" > ");
    metadata.language = to_proper_title_case(&metadata.language);
    metadata.keywords = metadata
        .keywords
        .into_iter()
        .map(|keyword| to_proper_title_case(&keyword))
        .collect();
    metadata
}

fn move_file(
    library_path: &str,
    current_filename: &str,
    current_url: &str,
    new_doctype: &str,
    new_category: &str,
    title: &str,
    conn: &rusqlite::Connection,
) -> Result<(String, String), String> {
    let file_extension = Path::new(current_filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    let category_parts: Vec<String> = new_category
        .split(" > ")
        .map(|part| part.trim().to_string())
        .collect();
    let folder_path = format!(
        "{}/{}",
        new_doctype,
        category_parts[..2.min(category_parts.len())].join("/")
    );
    let category_dir = Path::new(library_path).join(&folder_path);
    fs::create_dir_all(&category_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let safe_title = title.replace(
        &['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'][..],
        "_",
    );
    let mut new_filename = format!("{}.{}", safe_title, file_extension);

    let mut counter = 1;
    while Path::new(&category_dir).join(&new_filename).exists()
        || conn
            .query_row(
                "SELECT COUNT(*) FROM documents WHERE filename = ?",
                params![&new_filename],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0)
            > 0
    {
        new_filename = format!("{}_{}.{}", safe_title, counter, file_extension);
        counter += 1;
    }

    let relative_path = if current_url.starts_with("lib://") {
        &current_url[6..]
    } else {
        &current_url
    };
    let old_file_path = Path::new(library_path).join(relative_path);
    let new_file_path = category_dir.join(&new_filename);
    fs::rename(&old_file_path, &new_file_path).map_err(|e| {
        format!(
            "Failed to move file from '{:?}' to '{:?}': {}",
            old_file_path, new_file_path, e
        )
    })?;

    let new_url = format!("lib://{}/{}", folder_path, new_filename);

    Ok((new_filename, new_url))
}

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
struct DocumentMetadata {
    doctype: String,
    title: String,
    authors: Vec<String>,
    #[serde(rename = "publicationYear")]
    publication_year: Option<i32>,
    publisher: Option<String>,
    category: String,
    language: String,
    keywords: Vec<String>,
    r#abstract: String,
    favorite: bool,
    #[serde(rename = "numPages")]
    num_pages: i32,
    filesize: i64,
    format: String,
    metadata: Option<serde_json::Value>,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct LibraryDocument {
    id: String,
    path: String,
    filename: String,
    url: String,
    metadata: DocumentMetadata,
    #[serde(rename = "categoryPath")]
    category_path: Vec<String>,
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

#[tauri::command]
fn delete_documents(
    library_name: String,
    document_ids: Vec<String>,
) -> Result<serde_json::Value, String> {
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

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids.clone() {
        match (|| {
            let mut stmt = conn
                .prepare("SELECT url FROM documents WHERE id = ?")
                .map_err(|e| format!("Failed to prepare query: {}", e))?;

            let url_result: Result<String, rusqlite::Error> =
                stmt.query_row(params![document_id], |row| row.get::<_, String>(0));

            let url = match url_result {
                Ok(url) => url,
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    return Err("Document not found".to_string())
                }
                Err(e) => return Err(format!("Database error: {}", e)),
            };

            conn.execute("DELETE FROM documents WHERE id = ?", params![document_id])
                .map_err(|e| format!("Failed to delete document from database: {}", e))?;

            let relative_path = if url.starts_with("lib://") {
                &url[6..]
            } else {
                &url
            };

            let file_path = Path::new(&library.path).join(relative_path);
            if file_path.exists() {
                fs::remove_file(&file_path).map_err(|e| format!("Failed to delete file: {}", e))?;
            }

            Ok(())
        })() {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "id": document_id,
                "error": e
            })),
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "deletedCount": success_count,
        "errors": if errors.is_empty() { serde_json::Value::Null } else { serde_json::Value::Array(errors) }
    }))
}

#[tauri::command]
fn open_document(library_name: String, document_id: String) -> Result<(), String> {
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
        .prepare("SELECT url FROM documents WHERE id = ?")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let url_result: Result<String, rusqlite::Error> =
        stmt.query_row(params![document_id], |row| row.get::<_, String>(0));

    let url = match url_result {
        Ok(url) => url,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Err("Document not found".to_string()),
        Err(e) => return Err(format!("Database error: {}", e)),
    };

    let relative_path = if url.starts_with("lib://") {
        &url[6..]
    } else {
        &url
    };

    let file_path = Path::new(&library.path).join(relative_path);
    if !file_path.exists() {
        return Err("File not found".to_string());
    }

    let file_path_str = file_path.to_string_lossy();

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/c", "start", "", &file_path_str])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&file_path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&file_path_str)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        return Err("Unsupported platform".to_string());
    }

    Ok(())
}

#[tauri::command]
fn update_document(
    library_name: String,
    document_id: String,
    metadata: DocumentMetadata,
) -> Result<LibraryDocument, String> {
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

    let normalized_metadata = normalize_metadata(metadata);

    let db_path = Path::new(&library.path).join("db.sqlite");
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT filename, url, category, title, doctype FROM documents WHERE id = ?")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let existing_doc: (String, String, String, String, String) = stmt
        .query_row(params![document_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| format!("Failed to find document: {}", e))?;

    let (existing_filename, existing_url, old_category, old_title, old_doctype) = existing_doc;

    let new_category = normalized_metadata.category.clone();
    let new_title = normalized_metadata.title.clone();

    let now = chrono::Utc::now().to_rfc3339();

    let sql = r#"
        UPDATE documents SET
            title = ?,
            authors = ?,
            publicationYear = ?,
            numPages = ?,
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
        normalized_metadata.title,
        serde_json::to_string(&normalized_metadata.authors).unwrap(),
        normalized_metadata.publication_year,
        normalized_metadata.num_pages,
        normalized_metadata.publisher,
        normalized_metadata.category,
        normalized_metadata.language,
        serde_json::to_string(&normalized_metadata.keywords).unwrap(),
        normalized_metadata.r#abstract,
        normalized_metadata.doctype,
        normalized_metadata.favorite,
        normalized_metadata
            .metadata
            .as_ref()
            .map(|m| serde_json::to_string(m).unwrap()),
        now,
        document_id
    ];

    conn.execute(sql, params)
        .map_err(|e| format!("Failed to update document: {}", e))?;

    if old_category != new_category
        || old_title != new_title
        || old_doctype != normalized_metadata.doctype
    {
        let (new_filename, new_url) = move_file(
            &library.path,
            &existing_filename,
            &existing_url,
            &normalized_metadata.doctype,
            &new_category,
            &new_title,
            &conn,
        )?;

        conn.execute(
            "UPDATE documents SET filename = ?, url = ? WHERE id = ?",
            params![new_filename, new_url, document_id],
        )
        .map_err(|e| format!("Failed to update filename and url: {}", e))?;
    }

    let doc = LibraryDocument {
        id: document_id,
        path: "".to_string(),
        filename: "".to_string(),
        url: "".to_string(),
        metadata: normalized_metadata,
        category_path: vec![],
    };
    Ok(doc)
}

#[tauri::command]
fn move_documents(
    library_name: String,
    document_ids: Vec<String>,
    doctype: Option<String>,
    category: Option<String>,
) -> Result<serde_json::Value, String> {
    let has_doctype = doctype.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    let has_category = category.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
    if !has_doctype && !has_category {
        return Err("At least one of doctype or category must be provided".to_string());
    }

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

    let mut errors: Vec<serde_json::Value> = vec![];
    let mut success_count = 0;

    for document_id in document_ids {
        match (|| {
            let mut stmt = conn
                .prepare(
                    "SELECT filename, url, category, doctype, title FROM documents WHERE id = ?",
                )
                .map_err(|e| format!("Failed to prepare query: {}", e))?;

            let existing_doc: (String, String, String, String, String) = stmt
                .query_row(params![document_id], |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                    ))
                })
                .map_err(|e| format!("Failed to find document: {}", e))?;

            let (existing_filename, existing_url, old_category, old_doctype, title) = existing_doc;

            let new_doctype = doctype
                .as_ref()
                .filter(|s| !s.is_empty())
                .unwrap_or(&old_doctype)
                .clone();
            let new_category = category
                .as_ref()
                .filter(|s| !s.is_empty())
                .unwrap_or(&old_category)
                .clone();

            let update_sql = r#"
                UPDATE documents SET
                    doctype = ?,
                    category = ?,
                    updatedAt = ?
                WHERE id = ?
            "#;

            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                update_sql,
                params![new_doctype, new_category, now, document_id],
            )
            .map_err(|e| format!("Failed to update document: {}", e))?;

            if old_category != new_category || old_doctype != new_doctype {
                let (new_filename, new_url) = move_file(
                    &library.path,
                    &existing_filename,
                    &existing_url,
                    &new_doctype,
                    &new_category,
                    &title,
                    &conn,
                )?;

                conn.execute(
                    "UPDATE documents SET filename = ?, url = ? WHERE id = ?",
                    params![new_filename, new_url, document_id],
                )
                .map_err(|e| format!("Failed to update filename and url: {}", e))?;
            }

            Ok::<(), String>(())
        })() {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "id": document_id,
                "error": e
            })),
        }
    }

    Ok(serde_json::json!({
        "success": errors.is_empty(),
        "movedCount": success_count,
        "errorCount": errors.len(),
        "errors": if errors.is_empty() { serde_json::Value::Null } else { serde_json::Value::Array(errors) }
    }))
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
            get_document_cover,
            delete_documents,
            open_document,
            update_document,
            move_documents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
