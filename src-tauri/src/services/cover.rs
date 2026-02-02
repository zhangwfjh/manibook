use lazy_static::lazy_static;
use lru::LruCache;
use std::fs;
use std::path::Path;
use std::sync::Mutex;

lazy_static! {
    static ref COVER_CACHE: Mutex<LruCache<String, Vec<u8>>> =
        Mutex::new(LruCache::new(std::num::NonZeroUsize::new(100).unwrap()));
}

pub fn get_cover_path(library_path: &str, document_id: &str) -> std::path::PathBuf {
    Path::new(library_path)
        .join(".covers")
        .join(format!("{}.webp", document_id))
}

pub fn get_cover(library_path: &str, document_id: &str) -> Result<Option<Vec<u8>>, String> {
    {
        let mut cache = COVER_CACHE
            .lock()
            .map_err(|e| format!("Cache lock error: {}", e))?;
        if let Some(data) = cache.get(document_id) {
            return Ok(Some(data.clone()));
        }
    }

    let cover_path = get_cover_path(library_path, document_id);
    if !cover_path.exists() {
        return Ok(None);
    }

    let data = fs::read(&cover_path)
        .map_err(|e| format!("Failed to read cover {}: {}", document_id, e))?;

    {
        let mut cache = COVER_CACHE
            .lock()
            .map_err(|e| format!("Cache lock error: {}", e))?;
        cache.put(document_id.to_string(), data.clone());
    }

    Ok(Some(data))
}

pub fn save_cover(library_path: &str, document_id: &str, data: &[u8]) -> Result<(), String> {
    let covers_dir = Path::new(library_path).join(".covers");

    if !covers_dir.exists() {
        fs::create_dir_all(&covers_dir)
            .map_err(|e| format!("Failed to create covers directory: {}", e))?;
    }

    let cover_path = covers_dir.join(format!("{}.webp", document_id));
    fs::write(&cover_path, data)
        .map_err(|e| format!("Failed to write cover {}: {}", document_id, e))?;

    {
        let mut cache = COVER_CACHE
            .lock()
            .map_err(|e| format!("Cache lock error: {}", e))?;
        cache.put(document_id.to_string(), data.to_vec());
    }

    Ok(())
}
