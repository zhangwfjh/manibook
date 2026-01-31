use std::env;
use std::path::Path;

fn main() {
    // Determine the target platform
    let target = env::var("TARGET").unwrap_or_else(|_| "unknown".to_string());

    // Determine which PDFium binary to use based on target platform
    let source_name = if target.contains("windows") {
        "pdfium.dll"
    } else if target.contains("darwin") {
        "libpdfium.dylib"
    } else if target.contains("linux") {
        "libpdfium.so"
    } else {
        panic!("Unsupported target platform: {}", target);
    };

    // Check if the PDFium binary exists
    let source_path = Path::new(".").join(source_name);
    if !source_path.exists() {
        panic!(
            "PDFium binary not found: {}. Make sure to run the download script first.",
            source_path.display()
        );
    }

    println!("cargo:rerun-if-changed={}", source_path.display());

    tauri_build::build()
}
