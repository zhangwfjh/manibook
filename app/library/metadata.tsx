import mupdf from "mupdf";
import { parseEPUB } from "@/lib/parser";
import { openaiCall } from "@/lib/llm";
import fs from "fs";
import { execSync } from "child_process";
import { METADATA_EXTRACTION_PROMPT, OCR_PROMPT } from "./prompts";

interface LLMProvider {
  name: string;
  type: "OpenAI" | "Ollama";
  model: string;
  baseURL: string;
  apiKey?: string;
}

interface LLMSettings {
  providers: LLMProvider[];
  jobs: {
    metadataExtraction: string; // provider name
    imageTextExtraction: string; // provider name
  };
}

interface DocumentMetadata {
  doctype?: string;
  title?: string;
  authors: string[];
  publicationYear?: number;
  publisher?: string;
  category?: string;
  language?: string;
  keywords: string[];
  abstract?: string;
  [key: string]: unknown;
}

const MAX_FOREWORD_PAGES = 5;
const MAX_FOREWORD_LENGTH = 2000;

async function extractFromDjvu(
  buffer: Buffer
): Promise<{ foreword: string; cover: Uint8Array | null; numPages: number }> {
  let tempFilePath: string | null = null;
  let tmpCoverName: string | null = null;
  try {
    tempFilePath = `temp_djvu_${Date.now()}.djvu`;
    fs.writeFileSync(tempFilePath, buffer);

    const foreword = execSync(
      `djvutxt --page=1-${MAX_FOREWORD_PAGES} "${tempFilePath}"`
    )
      .toString()
      .slice(0, MAX_FOREWORD_LENGTH);
    tmpCoverName = tempFilePath.replace(/\.(djvu)$/i, "_cover.jpg");
    execSync(
      `ddjvu -format=tiff -page=1 -quality=80 "${tempFilePath}" "${tmpCoverName}"`
    );
    const cover = fs.readFileSync(tmpCoverName);
    const numPages = parseInt(
      execSync(`djvused -e n "${tempFilePath}"`).toString()
    );
    return { foreword, cover, numPages };
  } catch (error) {
    throw new Error(`Failed to extract from DJVU: ${error}`);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (tmpCoverName && fs.existsSync(tmpCoverName)) {
      fs.unlinkSync(tmpCoverName);
    }
  }
}

async function extractFromEpub(
  buffer: Buffer
): Promise<{ foreword: string; cover: Uint8Array | null; numPages: number }> {
  try {
    const epub = await parseEPUB(buffer);
    const cover = epub.coverImage
      ? new Uint8Array(await epub.coverImage.arrayBuffer())
      : null;
    const foreword = (
      await Promise.all(
        Array.from(
          { length: Math.min(MAX_FOREWORD_PAGES, epub.pages.length) },
          (_, i) => epub.pages[i]?.content || ""
        )
      )
    )
      .join("\n\n")
      .slice(0, MAX_FOREWORD_LENGTH);
    const numPages = epub.pages.length;
    return { foreword, cover, numPages };
  } catch (error) {
    throw new Error(`Failed to extract from EPUB: ${error}`);
  }
}

async function extractFromPdf(
  buffer: Buffer
): Promise<{ foreword: string; cover: Uint8Array | null; numPages: number }> {
  try {
    const document = mupdf.Document.openDocument(buffer);
    const numPages = document.countPages();
    const page = document.loadPage(0);
    const cover = page
      .toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB)
      .asJPEG(80);
    const foreword = (
      await Promise.all(
        Array.from({ length: Math.min(MAX_FOREWORD_PAGES, numPages) }, (_, i) =>
          document.loadPage(i).toStructuredText().asText()
        )
      )
    )
      .join("\n\n")
      .slice(0, MAX_FOREWORD_LENGTH);
    return { foreword, cover, numPages };
  } catch (error) {
    throw new Error(`Failed to extract from PDF: ${error}`);
  }
}

async function callLLMForImageText(
  cover: Uint8Array,
  provider: LLMProvider
): Promise<string> {
  const response = await openaiCall(
    [
      {
        role: "system",
        content: OCR_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "data:image;base64," + Buffer.from(cover).toString("base64"),
            },
          },
        ],
      },
    ],
    {
      model: provider.model,
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      temperature: 0,
    }
  );
  return response.choices[0].message.content || "";
}

async function callLLMForMetadata(
  foreword: string,
  provider: LLMProvider
): Promise<DocumentMetadata> {
  const response = await openaiCall(
    [
      {
        role: "system",
        content: METADATA_EXTRACTION_PROMPT,
      },
      {
        role: "user",
        content: foreword,
      },
    ],
    {
      model: provider.model,
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
      temperature: 0,
    }
  );
  return parseMetadataResponse(response.choices[0].message.content || "");
}

function parseMetadataResponse(responseString: string): DocumentMetadata {
  const jsonMatch = responseString.match(/```json\n([\s\S]*?)\n```/);
  const jsonString = jsonMatch?.[1] || responseString;
  const parsed = JSON.parse(jsonString);

  // Normalize category
  if (parsed.category && Array.isArray(parsed.category)) {
    parsed.category = parsed.category[0];
  }

  // Normalize keywords
  if (parsed.keywords) {
    if (typeof parsed.keywords === "string") {
      parsed.keywords = parsed.keywords
        .split(",")
        .map((kw: string) => kw.trim());
    }
    parsed.keywords = parsed.keywords.map((kw: string) =>
      kw.replace(/\b\w/g, (l: string) => l.toUpperCase())
    );
  } else {
    parsed.keywords = [];
  }

  // Normalize authors
  if (parsed.authors) {
    if (typeof parsed.authors === "string") {
      parsed.authors = parsed.authors.split(",").map((a: string) => a.trim());
    }
  } else {
    parsed.authors = ["Unknown Author"];
  }

  return parsed as DocumentMetadata;
}

export async function extractMetadataFromFile(
  buffer: Buffer,
  extension: string,
  llmSettings?: LLMSettings
): Promise<{
  metadata: DocumentMetadata;
  cover: Uint8Array | null;
  numPages: number;
}> {
  let extractor: (buffer: Buffer) => Promise<{
    foreword: string;
    cover: Uint8Array | null;
    numPages: number;
  }>;
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
    cover,
    numPages,
  } = await extractor(buffer);
  let foreword = initialForeword;

  if (cover && foreword.length < 100) {
    const imageProvider = llmSettings?.providers.find(
      (p) => p.name === llmSettings.jobs.imageTextExtraction
    );
    if (imageProvider) {
      foreword = await callLLMForImageText(cover, imageProvider);
    }
  }

  const metadataProvider = llmSettings?.providers.find(
    (p) => p.name === llmSettings.jobs.metadataExtraction
  );

  if (!metadataProvider) {
    throw new Error("Metadata extraction provider not found");
  }

  let metadata: DocumentMetadata;
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

  return { metadata: metadata!, cover, numPages };
}
