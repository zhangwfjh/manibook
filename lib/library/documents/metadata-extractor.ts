import { LLMSettings, DocumentMetadata, ExtractionResult } from "../types";
import { normalizeMetadata } from "../utils/metadata";
import {
  extractFromDjvu,
  extractFromEpub,
  extractFromPdf
} from "./extractors";
import { callLLMForImageText, callLLMForMetadata } from "./llm-integration";

const MAX_FOREWORD_LENGTH = 5000;

export async function extractMetadataFromFile(
  buffer: Buffer,
  extension: string,
  llmSettings?: LLMSettings
): Promise<ExtractionResult> {
  let extractor: (buffer: Buffer) => Promise<{ foreword: string; images: Uint8Array[]; numPages: number }>;
  switch (extension) {
    case "djvu":
      extractor = extractFromDjvu;
      break;
    case "epub":
      extractor = extractFromEpub;
      break;
    case "pdf":
      extractor = extractFromPdf;
      break;
    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }

  const {
    foreword: initialForeword,
    images,
    numPages,
  } = await extractor(buffer);
  let foreword = initialForeword;
  const cover = images[0] || null;

  if (images.length > 0 && foreword.length < 100) {
    const imageProvider = llmSettings?.providers.find(
      (p) => p.name === llmSettings.jobs.imageTextExtraction
    );
    if (imageProvider) {
      foreword = await callLLMForImageText(images, imageProvider);
    }
  }
  foreword = foreword.slice(0, MAX_FOREWORD_LENGTH);

  const metadataProvider = llmSettings?.providers.find(
    (p) => p.name === llmSettings.jobs.metadataExtraction
  );

  if (!metadataProvider) {
    throw new Error("Metadata extraction provider not found");
  }

  let metadata: DocumentMetadata | undefined;
  for (let retry = 0; retry < 3; retry++) {
    try {
      metadata = await callLLMForMetadata(foreword, metadataProvider);
      break;
    } catch (error) {
      if (retry === 2) {
        throw error;
      }
      console.warn(`Error extracting metadata, retrying...`);
      console.error(error);
    }
  }

  if (!metadata) {
    throw new Error("Failed to extract metadata after retries");
  }

  return { metadata: normalizeMetadata(metadata), cover, numPages };
}
