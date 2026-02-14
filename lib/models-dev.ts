// Models.dev API client for frontend

const MODELS_DEV_API_URL = "https://models.dev/api.json";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cache: { data: ModelsDevData; timestamp: number } | null = null;

export interface ModelsDevProvider {
  id: string;
  name: string;
  api?: string;
  env: string[];
  npm?: string;
  doc?: string;
  models: Record<string, ModelsDevModel>;
}

export interface ModelsDevModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  temperature?: boolean;
  modalities?: Modalities;
  cost?: Cost;
  limit?: Limit;
  open_weights?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
}

export interface Modalities {
  input: string[];
  output: string[];
}

export interface Cost {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
}

export interface Limit {
  context: number;
  output: number;
}

export interface ModelsDevData {
  providers: Record<string, ModelsDevProvider>;
}

export function supportsVision(model: ModelsDevModel): boolean {
  return model.attachment === true || (model.modalities?.input?.includes("image") ?? false);
}

export function supportsText(model: ModelsDevModel): boolean {
  return model.modalities?.output?.includes("text") ?? false;
}

export function formatCost(cost: Cost): string {
  if (cost.input === 0 && cost.output === 0) return "Free";
  return `$${cost.input}/${cost.output} per 1M tokens`;
}

export function formatContext(limit: Limit): string {
  if (limit.context >= 1000000) return `${(limit.context / 1000000).toFixed(1)}M`;
  if (limit.context >= 1000) return `${(limit.context / 1000).toFixed(0)}K`;
  return `${limit.context}`;
}

/// Fetch models.dev data from API or cache
export async function fetchModels(): Promise<ModelsDevData> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const response = await fetch(MODELS_DEV_API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch models.dev: ${response.status}`);
  }

  const raw: Record<string, ModelsDevProvider> = await response.json();
  const data: ModelsDevData = { providers: raw };

  // Update cache
  cache = { data, timestamp: Date.now() };

  return data;
}

/// Get all providers with API URLs (usable for OpenAI-compatible calls)
export async function listProviders(): Promise<ModelsDevProvider[]> {
  const data = await fetchModels();
  return Object.values(data.providers).filter((p) => p.api);
}

/// Get all models from all providers with API URLs
export async function listAllModels(): Promise<{ provider: ModelsDevProvider; model: ModelsDevModel }[]> {
  const providers = await listProviders();
  return providers.flatMap((provider) =>
    Object.values(provider.models).map((model) => ({ provider, model }))
  );
}

/// Get models suitable for vision (image text extraction)
export async function listVisionModels(): Promise<{ provider: ModelsDevProvider; model: ModelsDevModel }[]> {
  const all = await listAllModels();
  return all.filter(({ model }) => supportsVision(model));
}

/// Get models suitable for text (metadata extraction)
export async function listTextModels(): Promise<{ provider: ModelsDevProvider; model: ModelsDevModel }[]> {
  const all = await listAllModels();
  return all.filter(({ model }) => supportsText(model));
}

/// Get a model by its full ID (provider/model)
export async function getModelById(fullId: string): Promise<{ provider: ModelsDevProvider; model: ModelsDevModel } | null> {
  const data = await fetchModels();

  // Split on first '/' to get provider and model
  const slashIndex = fullId.indexOf("/");
  if (slashIndex === -1) return null;

  const providerId = fullId.slice(0, slashIndex);
  const modelId = fullId.slice(slashIndex + 1);

  const provider = data.providers[providerId];
  if (!provider) return null;

  const model = provider.models[modelId];
  if (!model) return null;

  return { provider, model };
}

/// Get a model, searching only in configured providers
export async function getModelFromConfiguredProviders(
  modelId: string,
  configuredProviderIds: string[]
): Promise<{ provider: ModelsDevProvider; model: ModelsDevModel } | null> {
  // First try as "provider/model" format
  const result = await getModelById(modelId);
  if (result) return result;

  // Search in configured providers
  const data = await fetchModels();
  for (const providerId of configuredProviderIds) {
    const provider = data.providers[providerId];
    if (provider) {
      const model = provider.models[modelId];
      if (model) {
        return { provider, model };
      }
    }
  }

  return null;
}

/// Clear the cache
export function clearCache(): void {
  cache = null;
}
