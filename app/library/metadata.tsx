import mupdf from "mupdf";
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
          images: [imageData.toBase64()],
        },
      ],
      { model: "qwen3-vl" }
    )
  ).message.content;

async function extractMetadataFromFile(filePath: string) {
  const extension = filePath.split(".").pop()?.toLowerCase();

  let coverText: string = "";
  let coverImage: Uint8Array;
  let numPages: number;
  let metadata: string;

  if (extension === "djvu") {
    coverText = execSync(`djvutxt --page=1 ${filePath}`).toString();
    execSync(
      `ddjvu -format=tiff -page=1 -quality=80 ${filePath} examples/cover.jpg`
    );
    coverImage = fs.readFileSync("examples/cover.jpg");
    numPages = parseInt(execSync(`djvused -e n ${filePath}`).toString());
  }
  if (extension === "epub") {
    // TODO
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
  for (let retry = 0; retry < 3; retry++) {
    try {
      metadata = (
        await qwenCall([
          {
            role: "system",
            content:
              "Extract title, authors, publication year, publisher, and other metadata from the document. " +
              "If any information is missing, leave it empty. " +
              "Infer the document type (Article or Book or Others). " +
              "Infer the 2-level category of the document (e.g., 'Physics > Classical Mechanics', 'Computer Vision > Object Detection'). " +
              "Respond in JSON format with keys: doctype, title, authors, publication_year, publisher, category, metadata.",
          },
          {
            role: "user",
            content: coverText,
          },
        ])
      ).choices[0].message.content;
      console.warn(`numPages=${numPages}, metadata=${metadata}`);
      metadata = JSON.parse(
        metadata.match(/```json\n([\s\S]*?)\n```/)?.[1] || metadata
      );
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
    if (file.endsWith(".pdf")) {
      console.info(`Processing file: ${file}`);
      const metadata = await extractMetadataFromFile(`${dirPath}/${file}`);
      const doctype = metadata.doctype || "unknown";
      const category = metadata.category || "uncategorized";
      const year = metadata.publication_year || "0000";
      const title = (metadata.title || "untitled").replace(
        /[\/\\?%*:|"<>]/g,
        "_"
      );
      const categoryPath = category
        .split(">")
        .map((c: string) => c.trim())
        .join("/");
      const newDir = `${dirPath}/${doctype}/${categoryPath}`;
      fs.mkdirSync(newDir, { recursive: true });
      fs.renameSync(`${dirPath}/${file}`, `${newDir}/[${year}] ${title}.pdf`);
    }
  }
}
