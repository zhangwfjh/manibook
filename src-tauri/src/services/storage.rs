use crate::utils::content::get_extension;
use crate::utils::path::sanitize_filename;
use std::fs;
use std::path::Path;

pub fn move_file(
    library_path: &str,
    current_url: &str,
    new_doctype: &str,
    new_category: &str,
    title: &str,
) -> Result<String, String> {
    log::debug!(
        "Moving file: current_url='{}', new_doctype='{}', new_category='{}'",
        current_url,
        new_doctype,
        new_category
    );

    let file_extension = get_extension(current_url);

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
    fs::create_dir_all(&category_dir).map_err(|e| {
        log::error!(
            "Failed to create directory {}: {}",
            category_dir.display(),
            e
        );
        format!("Failed to create directory: {}", e)
    })?;

    let safe_title = title.replace(
        &['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'][..],
        "_",
    );
    let mut new_filename = format!("{}.{}", safe_title, file_extension);

    let mut counter = 1;
    while Path::new(&category_dir).join(&new_filename).exists() {
        new_filename = format!("{}_{}.{}", safe_title, counter, file_extension);
        counter += 1;
    }

    let relative_path = current_url;
    let old_file_path = Path::new(library_path).join(relative_path);
    let new_file_path = category_dir.join(&new_filename);
    fs::rename(&old_file_path, &new_file_path).map_err(|e| {
        log::error!(
            "Failed to move file from '{}' to '{}': {}",
            old_file_path.display(),
            new_file_path.display(),
            e
        );
        format!(
            "Failed to move file from '{:?}' to '{:?}': {}",
            old_file_path, new_file_path, e
        )
    })?;

    let new_url = format!("{}/{}", folder_path, new_filename);

    log::debug!("Successfully moved file to: {}", new_file_path.display());
    Ok(new_url)
}

pub fn create_category_directory(
    library_path: &str,
    doctype: &str,
    category: &str,
) -> Result<String, String> {
    let category_parts: Vec<String> = category
        .split('>')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let folder_path = [
        doctype.to_string(),
        category_parts
            .first()
            .cloned()
            .unwrap_or_else(|| "General".to_string()),
        category_parts
            .get(1)
            .cloned()
            .unwrap_or_else(|| "General".to_string()),
    ]
    .join("/");

    let category_dir = Path::new(library_path).join(&folder_path);
    fs::create_dir_all(&category_dir).map_err(|e| {
        format!(
            "Failed to create directory {}: {}",
            category_dir.display(),
            e
        )
    })?;

    Ok(folder_path)
}

pub fn generate_unique_filename(
    category_dir: &Path,
    title: &str,
    extension: &str,
) -> Result<String, String> {
    let safe_title = sanitize_filename(title);
    let mut new_filename = format!("{}.{}", safe_title, extension);
    let mut counter = 1;

    while category_dir.join(&new_filename).exists() {
        new_filename = format!("{}_{}.{}", safe_title, counter, extension);
        counter += 1;
    }

    Ok(new_filename)
}

pub fn write_file(file_path: &Path, buffer: &[u8]) -> Result<(), String> {
    fs::write(file_path, buffer).map_err(|e| {
        log::error!("Failed to write file {}: {}", file_path.display(), e);
        format!("Failed to write file {}: {}", file_path.display(), e)
    })
}

pub fn file_exists(file_path: &Path) -> bool {
    file_path.exists()
}

pub fn delete_file(file_path: &Path) -> Result<(), String> {
    log::debug!("Deleting file: {}", file_path.display());
    fs::remove_file(file_path).map_err(|e| {
        log::error!("Failed to delete file {}: {}", file_path.display(), e);
        format!("Failed to delete file {}: {}", file_path.display(), e)
    })
}

pub fn get_lib_path(url: &str) -> Result<String, String> {
    Ok(url.to_string())
}
