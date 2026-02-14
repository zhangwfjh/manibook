use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Jobs {
    pub metadata_extraction: String,
    pub image_text_extraction: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct LLMSettings {
    pub api_keys: HashMap<String, String>,
    pub jobs: Jobs,
}

#[derive(Serialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: serde_json::Value,
}

#[derive(Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub response_format: Option<serde_json::Value>,
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Deserialize)]
pub struct ChatChoice {
    pub message: ChatResponseMessage,
}

#[derive(Deserialize)]
pub struct ChatResponseMessage {
    pub content: String,
}

#[derive(Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<ChatChoice>,
}
