import mupdf from "mupdf";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject, generateText } from "ai";
import fs from "fs";
import { z } from "zod";

const zai = createOpenAICompatible({
  name: "ZAI",
  apiKey: process.env.ZAI_API_KEY,
  baseURL: "https://open.bigmodel.cn/api/paas/v4/",
});

const extractTextFromImage = async (imageData: Uint8Array) =>
  (
    await generateText({
      model: zai("glm-4.6v-flash"),
      system:
        "Extract all readable text from this image. " +
        "Pay special attention to titles, author names, publication information, " +
        "and other metadata that would help identify this document.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract texts." },
            {
              type: "image",
              image: imageData,
            },
          ],
        },
      ],
    })
  ).text;

const determineDocType = async (text: string) =>
  (
    await generateObject({
      model: zai("glm-4.5-flash"),
      system: "Classify the document based on the cover text. The output should be one of 'article', 'book', or 'unknown'.",
      // "Classify the document into one of the following types based on the cover text. " +
      // "- 'article': Journal articles, conference papers, research papers, preprints " +
      // "- 'book': Fiction books, non-fiction books, textbooks " +
      // "- 'unknown': Neither of the above.",
      prompt: text,
      output: "enum",
      enum: ["article", "book", "unknown"],
    })
  ).object;

async function extractMetadataFromFile(filePath: string) {
  const extension = filePath.split(".").pop()?.toLowerCase();
  if (!["pdf", "epub", "mobi", "djvu"].includes(extension || "")) {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  let text: string;
  let cover: Uint8Array;

  if (extension === "djvu") {
  }

  const document = mupdf.Document.openDocument(fs.readFileSync(filePath));
  const numPages = document.countPages();
  const page = document.loadPage(0);
  cover = page
    .toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB)
    .asPNG();
  // fs.writeFileSync("example/cover.png", cover);
  text = page.toStructuredText().asText();
  if (text.length < 100) {
    text = await extractTextFromImage(cover);
  }

  const docType = await determineDocType(text);
  console.log(`numPages=${numPages}, docType=${docType}, text=${text}`);
}

await extractMetadataFromFile("examples/ocr.pdf");
