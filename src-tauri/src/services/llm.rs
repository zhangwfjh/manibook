use crate::models::document::Metadata;
use crate::models::llm::{ChatMessage, ChatRequest, ChatResponse, LLMProvider};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use lazy_static::lazy_static;
use regex::Regex;
use std::time::Duration;

lazy_static! {
    static ref JSON_CODE_BLOCK: Regex = Regex::new(r"```json\n([\s\S]*?)\n```").unwrap();
    static ref CODE_BLOCK_ALT: Regex = Regex::new(r"```\n([\s\S]*?)\n```").unwrap();
}

const OCR_PROMPT: &str = "Extract all legible text from the document. Prioritize:\n\
    1. Titles and headings\n\
    2. Author names\n\
    3. Publication details (journal, publisher, date, volume, issue, pages)\n\
    4. Metadata (DOI, ISSN, etc.)\n\
    Requirements:\n\
    - Preserve original text order and line breaks\n\
    - Exclude non-legible text, stamps, and watermarks\n\
    - Output ONLY the extracted text (no explanations)\n\
    - Format: One line per detected text line";

const METADATA_PROMPT: &str = "Extract structured metadata from the provided document. Return the result strictly in JSON format with the following keys:\n\
    doctype, title, authors, publication_year, publisher, category, language, keywords, abstract, metadata.\n\
    \n\
    Follow these rules precisely:\n\
    1. **Fields**:\n\
       - Extract: title, authors (as a list), publication year (as integer if possible), publisher, language (e.g., 'English', 'Chinese'), keywords (as a list), and abstract (as a string).\n\
       - If any field cannot be determined, leave its value empty (e.g., '' for strings, [] for lists, null for numbers)—do NOT use placeholders like 'unknown', 'none', or 'N/A'.\n\
    \n\
    2. **Document Type (doctype)**:\n\
       - Classify strictly as one of: 'Book', 'Paper', 'Report', 'Manual' or 'Others'.\n\
    \n\
    3. **Category**:\n\
       - Infer the most specific main category and subcategory (e.g., 'Computer Science > Artificial Intelligence').\n\
       - Format as: 'Main category > Subcategory'.\n\
       - If only a broad category is identifiable, use 'Main category > General'.\n\
    \n\
    4. **Metadata**:\n\
       - Use this field to include any other relevant structured information not covered above (e.g., DOI, ISBN, journal name, volume/issue). Represent as a JSON object or leave as an empty object {} if none.\n\
    \n\
    5. **Output**:\n\
       - Return ONLY valid JSON. Do not include explanations, markdown, or extra text.";

pub fn find_provider<'a>(
    providers: &'a [LLMProvider],
    name: &str,
) -> Result<&'a LLMProvider, String> {
    providers
        .iter()
        .find(|p| p.name == name)
        .ok_or_else(|| format!("Provider '{}' not found", name))
}

pub async fn call_openai_api(
    messages: Vec<ChatMessage>,
    provider: &LLMProvider,
    response_format: Option<&str>,
) -> Result<String, String> {
    log::debug!(
        "Calling LLM API: {} with model {}",
        provider.baseURL,
        provider.model
    );

    let client = reqwest::Client::new();
    let url = format!(
        "{}/chat/completions",
        provider.baseURL.trim_end_matches('/')
    );

    let request_body = ChatRequest {
        model: provider.model.clone(),
        messages,
        response_format: response_format.map(|rf| serde_json::json!({ "type": rf })),
        temperature: Some(0.0),
        stream: Some(false),
    };

    let mut request_builder = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body);

    if let Some(api_key) = &provider.apiKey {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", api_key));
    }

    let response = request_builder
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| {
            let err_msg = if e.is_timeout() {
                "LLM API request timed out after 30 seconds".to_string()
            } else if e.is_connect() {
                format!("Failed to connect to LLM API: {}", e)
            } else if e.is_request() {
                format!("Failed to send request to LLM API: {}", e)
            } else {
                format!("LLM API request failed: {}", e)
            };
            log::error!("{}", err_msg);
            err_msg
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("LLM API error: status={}, body={}", status, error_text);
        return Err(format!(
            "LLM API returned error {} (status): {}",
            status, error_text
        ));
    }

    log::debug!("LLM API request successful");

    let chat_response: ChatResponse = response.json().await.map_err(|e| {
        log::error!("Failed to parse LLM response: {}", e);
        format!("Failed to parse LLM response: {}", e)
    })?;

    chat_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .ok_or_else(|| {
            log::error!("LLM API returned empty response");
            "LLM API returned empty response".to_string()
        })
}

pub fn parse_metadata_response(response: &str) -> Result<Metadata, String> {
    log::debug!("Parsing metadata response ({} chars)", response.len());

    let json_string = if let Some(captures) = JSON_CODE_BLOCK.captures(response) {
        captures.get(1).map(|m| m.as_str()).unwrap_or(response)
    } else if let Some(captures) = CODE_BLOCK_ALT.captures(response) {
        captures.get(1).map(|m| m.as_str()).unwrap_or(response)
    } else {
        response
    };

    let mut metadata: serde_json::Value = serde_json::from_str(json_string).map_err(|e| {
        log::error!("Failed to parse metadata JSON: {}", e);
        format!("Failed to parse metadata JSON: {}", e)
    })?;

    if let Some(category) = metadata.get_mut("category") {
        if let Some(arr) = category.as_array() {
            if !arr.is_empty() {
                *category =
                    serde_json::Value::String(arr[0].as_str().unwrap_or_default().to_string());
            }
        }
    }

    if let Some(keywords) = metadata.get_mut("keywords") {
        if let Some(kw_str) = keywords.as_str() {
            let kw_list: Vec<String> = kw_str
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            *keywords = serde_json::Value::Array(
                kw_list.into_iter().map(serde_json::Value::String).collect(),
            );
        }
    } else {
        metadata["keywords"] = serde_json::Value::Array(vec![]);
    }

    if let Some(authors) = metadata.get_mut("authors") {
        if let Some(auth_str) = authors.as_str() {
            let auth_list: Vec<String> = auth_str
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            *authors = serde_json::Value::Array(
                auth_list
                    .into_iter()
                    .map(serde_json::Value::String)
                    .collect(),
            );
        }
    } else {
        metadata["authors"] = serde_json::Value::Array(
            vec!["Unknown Author".to_string()]
                .into_iter()
                .map(serde_json::Value::String)
                .collect(),
        );
    }

    let doctype = metadata
        .get("doctype")
        .and_then(|v| v.as_str())
        .unwrap_or("Book")
        .to_string();
    let title = metadata
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let authors: Vec<String> = metadata
        .get("authors")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let publication_year = metadata
        .get("publication_year")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);
    let publisher = metadata
        .get("publisher")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let category = metadata
        .get("category")
        .and_then(|v| v.as_str())
        .unwrap_or("General > General")
        .to_string();
    let language = metadata
        .get("language")
        .and_then(|v| v.as_str())
        .unwrap_or("English")
        .to_string();
    let keywords: Vec<String> = metadata
        .get("keywords")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    let r#abstract = metadata
        .get("abstract")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let extra_metadata = metadata.get("metadata").cloned();

    log::debug!(
        "Successfully parsed metadata: title='{}', doctype='{}', category='{}'",
        title.clone(),
        doctype.clone(),
        category.clone()
    );

    let meta = Metadata {
        doctype,
        title,
        authors,
        publication_year,
        publisher,
        category,
        language,
        keywords,
        r#abstract,
        favorite: false,
        num_pages: 0,
        filesize: 0,
        format: "".to_string(),
        metadata: extra_metadata,
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok(meta)
}

pub async fn extract_text_from_images(
    images: &[Vec<u8>],
    provider: &LLMProvider,
) -> Result<String, String> {
    if images.is_empty() {
        return Ok(String::new());
    }

    log::debug!("Extracting text from {} images", images.len());

    let base64_images: Vec<String> = images
        .iter()
        .take(1)
        .map(|img| format!("data:image;base64,{}", STANDARD.encode(img)))
        .collect();

    let image_contents: Vec<serde_json::Value> = base64_images
        .iter()
        .map(|img| {
            serde_json::json!({
                "type": "image_url",
                "image_url": {
                    "url": img
                }
            })
        })
        .collect();

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: serde_json::Value::String(OCR_PROMPT.to_string()),
        },
        ChatMessage {
            role: "user".to_string(),
            content: serde_json::json!(image_contents),
        },
    ];

    match call_openai_api(messages, provider, None).await {
        Ok(result) => {
            log::debug!(
                "Successfully extracted text from images ({} chars)",
                result.len()
            );
            Ok(result)
        }
        Err(e) => {
            log::error!("Failed to extract text from images: {}", e);
            Err(e)
        }
    }
}

pub async fn extract_metadata_from_text(
    text: &str,
    provider: &LLMProvider,
) -> Result<Metadata, String> {
    log::debug!("Extracting metadata from text ({} chars)", text.len());

    let truncated_text = text.chars().take(5000).collect::<String>();

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: serde_json::Value::String(METADATA_PROMPT.to_string()),
        },
        ChatMessage {
            role: "user".to_string(),
            content: serde_json::Value::String(truncated_text),
        },
    ];

    let mut metadata: Option<Metadata> = None;
    for retry in 0..3 {
        log::debug!("Metadata extraction attempt {}/3", retry + 1);

        match call_openai_api(messages.clone(), provider, Some("json_object")).await {
            Ok(response) => match parse_metadata_response(&response) {
                Ok(parsed) => {
                    metadata = Some(parsed);
                    log::info!("Successfully extracted metadata on attempt {}", retry + 1);
                    break;
                }
                Err(e) => {
                    log::warn!(
                        "Failed to parse metadata response (attempt {}/3): {}",
                        retry + 1,
                        e
                    );
                }
            },
            Err(e) => {
                log::warn!("LLM API call failed (attempt {}/3): {}", retry + 1, e);
            }
        }
    }

    metadata.ok_or_else(|| {
        log::error!("Failed to extract metadata after 3 attempts");
        "Failed to extract metadata after 3 attempts. Check LLM provider configuration and try again.".to_string()
    })
}
