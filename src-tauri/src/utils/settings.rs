use std::fs;
use std::path::Path;

pub fn read_json_file_with_default<T>(file_path: &Path, default: T) -> Result<T, String>
where
    T: serde::de::DeserializeOwned,
{
    match fs::read_to_string(file_path) {
        Ok(json_string) => serde_json::from_str(&json_string)
            .map_err(|e| format!("Failed to parse settings: {}", e)),
        Err(_) => Ok(default),
    }
}

pub fn write_json_file<T>(file_path: &Path, data: &T) -> Result<(), String>
where
    T: serde::Serialize,
{
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create settings dir: {}", e))?;
    }
    let json_data = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(file_path, json_data).map_err(|e| format!("Failed to write settings: {}", e))
}
