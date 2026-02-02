use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[allow(non_snake_case)]
pub struct LLMProvider {
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub model: String,
    pub baseURL: String,
    pub apiKey: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[allow(non_snake_case)]
pub struct Jobs {
    pub metadataExtraction: String,
    pub imageTextExtraction: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LLMSettings {
    pub providers: Vec<LLMProvider>,
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
