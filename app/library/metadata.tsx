import mupdf from "mupdf";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import fs from "fs";

const zai = createOpenAICompatible({
  name: "ZAI",
  apiKey: process.env.ZAI_API_KEY,
  baseURL: "https://open.bigmodel.cn/api/paas/v4/",
});

const extract_text_from_image = async (imagePath: string) => {
  const { text } = await generateText({
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
            image: fs.readFileSync(imagePath),
          },
        ],
      },
    ],
  });
  return text;
};

console.log(await extract_text_from_image("examples/img.png"));

const extract_metadata_from_file = async (filePath: string) => {
  const document = mupdf.PDFDocument.openDocument(fs.readFileSync(filePath));
  const format = document.getMetaData("format");
  const modificationDate = document.getMetaData("info:ModDate");
  const author = document.getMetaData("info:Author");
  const numPages = document.countPages();
  const page = document.loadPage(0);
  const cover = page
    .toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB)
    .asPNG();
  const text = page.toStructuredText().asText();
  console.log(
    `format=${format}, modificationDate=${modificationDate}, author=${author}, numPages=${numPages}, text=${text}`
  );
};

await extract_metadata_from_file("examples/ebook.epub");
