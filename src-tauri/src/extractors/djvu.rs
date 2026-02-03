use crate::extractors::Extractor;
use crate::utils::image::encode_cover_webp;
use tempfile::NamedTempFile;
use tokio::process::Command;

pub struct DjvuExtractor;

impl DjvuExtractor {
    fn create_temp_djvu(buffer: &[u8]) -> Result<(NamedTempFile, String), String> {
        let mut temp =
            NamedTempFile::new().map_err(|e| format!("Failed to create temp file: {}", e))?;
        std::io::Write::write_all(&mut temp, buffer)
            .map_err(|e| format!("Failed to write to temp file: {}", e))?;
        let path = temp.path().to_string_lossy().to_string();
        Ok((temp, path))
    }

    async fn run_command(cmd: &str, args: &[&str]) -> Result<std::process::Output, String> {
        Command::new(cmd)
            .args(args)
            .output()
            .await
            .map_err(|e| format!("Failed to run {}: {}", cmd, e))
    }

    async fn run_command_checked(cmd: &str, args: &[&str]) -> Result<Vec<u8>, String> {
        let output = Self::run_command(cmd, args).await?;
        if !output.status.success() {
            return Err(format!(
                "{} failed: {}",
                cmd,
                String::from_utf8_lossy(&output.stderr)
            ));
        }
        Ok(output.stdout)
    }

    fn parse_range(from: Option<i32>, length: Option<i32>) -> (i32, i32) {
        let from = from.unwrap_or(1).max(1);
        let length = length.unwrap_or(i32::MAX);
        let start = from;
        let end = if length == i32::MAX {
            i32::MAX
        } else {
            start.saturating_add(length - 1)
        };
        (start, end)
    }

    async fn get_page_count(path: &str) -> Result<i32, String> {
        let stdout = Self::run_command_checked("djvused", &["-e", "n", path]).await?;
        let num_str = String::from_utf8(stdout)
            .map_err(|e| format!("Failed to parse djvused output: {}", e))?
            .trim()
            .to_string();
        num_str
            .parse()
            .map_err(|e| format!("Failed to parse page count: {}", e))
    }
}

impl Extractor for DjvuExtractor {
    async fn extract_text(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<String, String> {
        let (_temp, path) = Self::create_temp_djvu(buffer)?;

        let (start, end) = Self::parse_range(from, length);
        let stdout =
            Self::run_command_checked("djvutxt", &[&format!("--page={}-{}", start, end), &path])
                .await?;

        String::from_utf8(stdout).map_err(|e| format!("Failed to parse djvutxt output: {}", e))
    }

    async fn extract_images(
        buffer: &[u8],
        from: Option<i32>,
        length: Option<i32>,
    ) -> Result<Vec<Vec<u8>>, String> {
        let (_temp, path) = Self::create_temp_djvu(buffer)?;

        let (start, end) = Self::parse_range(from, length);
        let mut images: Vec<Vec<u8>> = Vec::new();

        for page_num in start..=end {
            let output = Self::run_command(
                "ddjvu",
                &["-format=pnm", &format!("-page={}", page_num), &path],
            )
            .await;

            if let Ok(output) = output {
                if output.status.success() {
                    if let Ok(img) = image::load_from_memory(&output.stdout) {
                        if let Ok(webp_buffer) = encode_cover_webp(&img) {
                            images.push(webp_buffer);
                        }
                    }
                }
            }
        }

        Ok(images)
    }

    async fn extract_metadata(buffer: &[u8]) -> Result<serde_json::Value, String> {
        let (_temp, path) = Self::create_temp_djvu(buffer)?;

        let page_count = Self::get_page_count(&path).await?;

        let metadata_output = Self::run_command("djvused", &["-e", "print-meta", &path]).await;
        let mut metadata = serde_json::Map::new();
        metadata.insert(
            "page_count".to_string(),
            serde_json::Value::Number(serde_json::Number::from(page_count)),
        );

        if let Ok(output) = metadata_output {
            if output.status.success() {
                let meta_text = String::from_utf8(output.stdout).unwrap_or_default();
                for line in meta_text.lines() {
                    if let Some((key, value)) = line.split_once(':') {
                        let key = key.trim().to_lowercase();
                        let value = value.trim().to_string();
                        if !value.is_empty() {
                            let json_key = match key.as_str() {
                                "title" => "title",
                                "author" => "author",
                                "creator" => "author",
                                "subject" => "subject",
                                "keywords" => "keywords",
                                "publisher" => "publisher",
                                "language" => "language",
                                "identifier" => "identifier",
                                _ => continue,
                            };
                            metadata.insert(json_key.to_string(), serde_json::Value::String(value));
                        }
                    }
                }
            }
        }

        Ok(serde_json::Value::Object(metadata))
    }
}
