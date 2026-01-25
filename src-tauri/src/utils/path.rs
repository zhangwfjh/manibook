use std::path::Path;

pub fn sanitize_filename(title: &str) -> String {
    title.replace(
        &['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'][..],
        "_",
    )
}

pub fn get_extension(filename: &str) -> String {
    Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase()
}
