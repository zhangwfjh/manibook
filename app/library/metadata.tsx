import mupdf from "mupdf";
import { parseEPUB } from "@/lib/epub";
import { ollamaCall, qwenCall } from "@/lib/llms";
import fs from "fs";
import { execSync } from "child_process";

const extractTextFromImage = async (imageData: Uint8Array) =>
  (
    await ollamaCall(
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
          content: "Extract texts.",
          images: [Buffer.from(imageData).toString('base64')],
        },
      ],
      { model: "qwen3-vl" }
    )
  ).message.content;

interface LLMProvider {
  name: string;
  type: 'openai-compatible' | 'ollama';
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

export async function extractMetadataFromFile(filePath: string, llmSettings?: LLMSettings) {
  const extension = filePath.split(".").pop()?.toLowerCase();

  let coverText: string = "";
  let coverImage: Uint8Array;
  let numPages: number = 0;
  let metadata: Record<string, unknown> = {};

  if (extension === "djvu") {
    coverText = execSync(`djvutxt --page=1-5 "${filePath}"`).toString();
    // execSync(
    //   `ddjvu -format=tiff -page=1 -quality=80 ${filePath} examples/cover.jpg`
    // );
    // coverImage = fs.readFileSync("examples/cover.jpg");
    numPages = parseInt(execSync(`djvused -e n "${filePath}"`).toString());
  }
  if (extension === "epub") {
    const epub = await parseEPUB(fs.readFileSync(filePath));
    // coverImage = new Uint8Array(await epub.coverImage!.arrayBuffer());
    coverText = (
      await Promise.all(
        Array.from({ length: 5 }, (_, i) => epub.pages[i]?.content || "")
      )
    ).join("\n\n").slice(0, 2000);
  }
  if (extension === "pdf") {
    const document = mupdf.Document.openDocument(fs.readFileSync(filePath));
    numPages = document.countPages();
    const page = document.loadPage(0);
    // coverImage = page
    //   .toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB)
    //   .asJPEG(80);
    // fs.writeFileSync("examples/cover.jpg", coverImage);
    coverText = page.toStructuredText().asText();
    if (coverText.length < 100) {
      coverText = (
        await Promise.all(
          Array.from({ length: Math.min(5, numPages) }, (_, i) =>
            document.loadPage(i).toStructuredText().asText()
          )
        )
      ).join("\n\n");
    }
    // if (coverText.length < 100) {
    //   coverText = await extractTextFromImage(coverImage);
    // }
  }
  // Get the provider for metadata extraction
  const metadataProvider = llmSettings?.providers.find(p => p.name === llmSettings.jobs.metadataExtraction);

  for (let retry = 0; retry < 3; retry++) {
    try {
      const responseString = (
        await qwenCall(
          [
            {
              role: "system",
              content:
                "Extract title, authors, publication year, publisher, and other metadata from the document. " +
                "If any information is missing, leave it empty. " +
                "Infer the document type (Article or Book or Others). " +
                "Infer the 2-level category of the document (e.g., 'Physics > Classical Mechanics', 'Computer Vision > Object Detection'). " +
                "Also infer the language, keywords and abstract of the document. " +
                "Respond in JSON format with keys: doctype, title, authors, publication_year, publisher, category, language, keywords, abstract, metadata.",
            },
            {
              role: "user",
              content: coverText,
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

  return metadata;
}

async function sortFiles(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const extension = file.slice(file.lastIndexOf("."));
    if (file.endsWith(".epub") || file.endsWith(".pdf") || file.endsWith(".djvu")) {
      console.info(`Processing file: ${file}`);
      const metadata = await extractMetadataFromFile(`${dirPath}/${file}`);
      const doctype = (metadata.doctype as string) || "unknown";
      const category = (metadata.category as string) || "uncategorized";
      const year = metadata.publication_year || "0000";
      const title = ((metadata.title as string) || "untitled").replace(
        /[\/\\?%*:|"<>]/g,
        "_"
      );
      const categoryPath = category
        .split(">")
        .map((c: string) => c.trim())
        .join("/");
      const newDir = `${dirPath}/${doctype}/${categoryPath}`;
      fs.mkdirSync(newDir, { recursive: true });
      fs.renameSync(`${dirPath}/${file}`, `${newDir}/[${year}] ${title}.${extension}`);
    }
  }
}

async function generateMetadataForLibrary(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = `${dirPath}/${file}`;
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && file.match(/\.(pdf|epub|djvu)$/i)) {
      const jsonPath = fullPath.replace(/\.(pdf|epub|djvu)$/i, '.json');
      if (!fs.existsSync(jsonPath)) {
        console.info(`Processing file: ${file}`);
        try {
          const metadata = await extractMetadataFromFile(fullPath);
          fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
          console.info(`Generated metadata for: ${file}`);
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
        }
      } else {
        console.info(`Metadata already exists for: ${file}`);
      }
    }
  }
}
