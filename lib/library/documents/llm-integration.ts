import { openaiCall } from "@/lib/llm";
import { LLMProvider, DocumentMetadata } from "../types";
import { OCR_PROMPT, METADATA_EXTRACTION_PROMPT } from "../prompts";

export async function callLLMForImageText(
  images: Uint8Array[],
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
        content: images.map((img) => ({
          type: "image_url",
          image_url: {
            url: "data:image;base64," + Buffer.from(img).toString("base64"),
          },
        })),
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

export async function callLLMForMetadata(
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

  if (parsed.category && Array.isArray(parsed.category)) {
    parsed.category = parsed.category[0];
  }

  if (parsed.keywords) {
    if (typeof parsed.keywords === "string") {
      parsed.keywords = parsed.keywords
        .split(",")
        .map((kw: string) => kw.trim());
    }
  } else {
    parsed.keywords = [];
  }

  if (parsed.authors) {
    if (typeof parsed.authors === "string") {
      parsed.authors = parsed.authors.split(",").map((a: string) => a.trim());
    }
  } else {
    parsed.authors = ["Unknown Author"];
  }

  return parsed;
}
