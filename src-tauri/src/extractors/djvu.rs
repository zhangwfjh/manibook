use crate::extractors::{Extractor, ForewordExtraction};
use image::ImageFormat;
use std::fs;
use tempfile::NamedTempFile;
use tokio::process::Command;

pub struct DjvuExtractor;

impl Extractor for DjvuExtractor {
    async fn extract(buffer: &[u8]) -> Result<ForewordExtraction, String> {
        let mut temp_djvu =
            NamedTempFile::new().map_err(|e| format!("Failed to create temp file: {}", e))?;
        std::io::Write::write_all(&mut temp_djvu, buffer)
            .map_err(|e| format!("Failed to write to temp file: {}", e))?;
        let temp_djvu_path = temp_djvu.path().to_string_lossy().to_string();

        let output = Command::new("djvutxt")
            .args(&["--page=1-10", &temp_djvu_path])
            .output()
            .await
            .map_err(|e| format!("Failed to run djvutxt: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "djvutxt failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let mut foreword = String::from_utf8(output.stdout)
            .map_err(|e| format!("Failed to parse djvutxt output: {}", e))?;
        if foreword.len() > Self::MAX_FOREWORD_LENGTH {
            let mut end = Self::MAX_FOREWORD_LENGTH;
            while end > 0 && !foreword.is_char_boundary(end) {
                end -= 1;
            }
            foreword.truncate(end);
        }

        let num_pages_output = Command::new("djvused")
            .args(&["-e", "n", &temp_djvu_path])
            .output()
            .await
            .map_err(|e| format!("Failed to run djvused: {}", e))?;

        if !num_pages_output.status.success() {
            return Err(format!(
                "djvused failed: {}",
                String::from_utf8_lossy(&num_pages_output.stderr)
            ));
        }

        let num_pages_str = String::from_utf8(num_pages_output.stdout)
            .map_err(|e| format!("Failed to parse djvused output: {}", e))?
            .trim()
            .to_string();
        let num_pages: i32 = num_pages_str
            .parse()
            .map_err(|e| format!("Failed to parse num pages: {}", e))?;

        let temp_tiff =
            NamedTempFile::new().map_err(|e| format!("Failed to create temp TIFF file: {}", e))?;
        let temp_tiff_path = temp_tiff.path().to_string_lossy().to_string();

        let ddjvu_output = Command::new("ddjvu")
            .args(&["-format=tiff", "-page=1", &temp_djvu_path, &temp_tiff_path])
            .output()
            .await
            .map_err(|e| format!("Failed to run ddjvu: {}", e))?;

        if !ddjvu_output.status.success() {
            return Err(format!(
                "ddjvu failed: {}",
                String::from_utf8_lossy(&ddjvu_output.stderr)
            ));
        }

        let tiff_data =
            fs::read(&temp_tiff_path).map_err(|e| format!("Failed to read TIFF file: {}", e))?;
        let img = image::load_from_memory(&tiff_data)
            .map_err(|e| format!("Failed to load TIFF image: {}", e))?;

        let mut webp_buffer = Vec::new();
        img.write_to(
            &mut std::io::Cursor::new(&mut webp_buffer),
            ImageFormat::WebP,
        )
        .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        let images = if webp_buffer.is_empty() {
            vec![]
        } else {
            vec![webp_buffer]
        };

        drop(temp_tiff);
        fs::remove_file(&temp_tiff_path).ok();

        Ok(ForewordExtraction {
            foreword,
            images,
            num_pages,
        })
    }
}
