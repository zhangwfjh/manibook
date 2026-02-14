use crate::models::models_dev::{ModelsDevData, ModelsDevModel, ModelsDevProvider};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

const MODELS_DEV_API_URL: &str = "https://models.dev/api.json";
const CACHE_TTL: Duration = Duration::from_secs(60 * 60); // 1 hour cache

static MODELS_CACHE: OnceLock<Arc<Mutex<Option<(ModelsDevData, Instant)>>>> = OnceLock::new();

fn get_cache() -> &'static Arc<Mutex<Option<(ModelsDevData, Instant)>>> {
    MODELS_CACHE.get_or_init(|| Arc::new(Mutex::new(None)))
}

async fn fetch_models() -> Result<ModelsDevData, String> {
    {
        let cache = get_cache()
            .lock()
            .map_err(|e| format!("Cache lock error: {}", e))?;
        if let Some((data, timestamp)) = cache.as_ref() {
            if timestamp.elapsed() < CACHE_TTL {
                log::debug!("Using cached models.dev data");
                return Ok(data.clone());
            }
        }
    }

    log::info!("Fetching models.dev data from API");
    let client = reqwest::Client::new();
    let response = client
        .get(MODELS_DEV_API_URL)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models.dev API: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "models.dev API returned status {}",
            response.status()
        ));
    }

    let json = response
        .text()
        .await
        .map_err(|e| format!("Failed to read models.dev response: {}", e))?;

    let data = ModelsDevData::from_json(&json)
        .map_err(|e| format!("Failed to parse models.dev JSON: {}", e))?;

    {
        let mut cache = get_cache()
            .lock()
            .map_err(|e| format!("Cache lock error: {}", e))?;
        *cache = Some((data.clone(), Instant::now()));
    }

    log::info!("Cached {} providers from models.dev", data.providers.len());
    Ok(data)
}

pub async fn get_models() -> Result<ModelsDevData, String> {
    fetch_models().await
}

pub async fn get_model_from_configured_providers(
    model_id: &str,
    configured_provider_ids: &[String],
) -> Result<Option<(ModelsDevProvider, ModelsDevModel)>, String> {
    let data = get_models().await?;

    if let Some((provider, model)) = data.get_model(model_id) {
        return Ok(Some((provider, model)));
    }

    if let Some((provider, model)) =
        data.get_model_from_providers(model_id, configured_provider_ids)
    {
        return Ok(Some((provider, model)));
    }

    Ok(None)
}
