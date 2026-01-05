import mupdf from "mupdf";
import { parseEPUB } from "@/lib/epub";
import { vllmCall } from "@/lib/llms";
import fs from "fs";
import { execSync } from "child_process";

interface LLMProvider {
  name: string;
  type: "openai-compatible" | "ollama";
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

export async function extractMetadataFromFile(
  filePath: string,
  llmSettings?: LLMSettings
): Promise<{ metadata: Record<string, unknown>; cover: Uint8Array | null; numPages: number }> {
  const extension = filePath.split(".").pop()?.toLowerCase();

  let foreword: string = "";
  let cover: Uint8Array | null = null;
  let numPages: number = 0;
  let metadata: Record<string, unknown> = {};
  const maxForewordPages = 5;
  const maxForewordLength = 2000;

  if (extension === "djvu") {
    foreword = execSync(`djvutxt --page=1-${maxForewordPages} "${filePath}"`)
      .toString()
      .slice(0, maxForewordLength);
    const tmpCoverName = filePath.replace(/\.(djvu)$/i, "_cover.jpg");
    console.log(tmpCoverName);
    execSync(
      `ddjvu -format=tiff -page=1 -quality=80 "${filePath}" "${tmpCoverName}"`
    );
    cover = fs.readFileSync(tmpCoverName);
    fs.unlinkSync(tmpCoverName);
    numPages = parseInt(execSync(`djvused -e n "${filePath}"`).toString());
  }
  if (extension === "epub") {
    const epub = await parseEPUB(fs.readFileSync(filePath));
    if (epub.coverImage) {
      cover = new Uint8Array(await epub.coverImage.arrayBuffer());
    }
    foreword = (
      await Promise.all(
        Array.from(
          { length: maxForewordPages },
          (_, i) => epub.pages[i]?.content || ""
        )
      )
    )
      .join("\n\n")
      .slice(0, maxForewordLength);
    numPages = epub.pages.length;
  }
  if (extension === "pdf") {
    const document = mupdf.Document.openDocument(fs.readFileSync(filePath));
    numPages = document.countPages();
    const page = document.loadPage(0);
    cover = page
      .toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB)
      .asJPEG(80);
    foreword = (
      await Promise.all(
        Array.from({ length: Math.min(maxForewordPages, numPages) }, (_, i) =>
          document.loadPage(i).toStructuredText().asText()
        )
      )
    ).join("\n\n");
  }

  if (cover && foreword.length < 100) {
    const metadataProvider = llmSettings?.providers.find(
      (p) => p.name === llmSettings.jobs.imageTextExtraction
    );

    foreword = (
      await vllmCall(
        [
          {
            role: "system",
            content:
              "Extract all readable text from this image. " +
              "Pay special attention to titles, author names, publication information, " +
              "and other metadata that would help identify this document.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url:
                    "data:image;base64," +
                    Buffer.from(cover).toString("base64"),
                },
              },
            ],
          },
        ],
        {
          model: metadataProvider!.model,
          baseURL: metadataProvider!.baseURL,
          apiKey: metadataProvider!.apiKey,
        }
      )
    ).choices[0].message.content;
  }

  const metadataProvider = llmSettings?.providers.find(
    (p) => p.name === llmSettings.jobs.metadataExtraction
  );

  for (let retry = 0; retry < 3; retry++) {
    try {
      const responseString = (
        await vllmCall(
          [
            {
              role: "system",
              content:
                "Extract title, authors, publication year, publisher, and other metadata from the document. " +
                "If any information is missing, leave it empty. " +
                "Infer the document type (Article or Book or Others). " +
                "Infer the unique TWO-level category of the document (e.g., 'Physics > Classical Mechanics', 'Computer Vision > Object Detection'). " +
                "Also infer the language (e.g., 'Chinese', 'English'), keywords and abstract of the document. " +
                "Respond in JSON format with keys: doctype, title, authors, publication_year, publisher, category, language, keywords, abstract, metadata.",
            },
            {
              role: "user",
              content: foreword,
            },
          ],
          {
            model: metadataProvider!.model,
            baseURL: metadataProvider!.baseURL,
            apiKey: metadataProvider!.apiKey,
          }
        )
      ).choices[0].message.content;
      console.warn(`numPages=${numPages}, metadata=${responseString}`);
      const jsonMatch = responseString.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch?.[1] || responseString;
      metadata = JSON.parse(jsonString);
      break;
    } catch (error) {
      if (retry === 2) {
        throw error;
      }
      console.warn(`Error parsing metadata, retrying...`);
    }
  }

  return { metadata, cover, numPages };
}
