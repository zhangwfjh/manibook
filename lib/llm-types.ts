export interface Jobs {
  metadata_extraction: string;   // Model ID: "provider/model" or "provider/org/model"
  image_text_extraction: string; // Model ID: "provider/model" or "provider/org/model"
}

export interface LLMSettings {
  api_keys: Record<string, string>; // provider_id → API key
  jobs: Jobs;
}

export const emptyLLMSettings: LLMSettings = {
  api_keys: {},
  jobs: {
    metadata_extraction: "",
    image_text_extraction: "",
  },
};
