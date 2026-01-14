import mupdf from "mupdf";
import { convertToWebP } from "./utils";
import { ForewordExtraction } from "../../types";

const MAX_FOREWORD_LENGTH = 5000;

export async function extractFromPdf(buffer: Buffer): Promise<ForewordExtraction> {
  try {
    const document = mupdf.Document.openDocument(buffer);
    const numPages = document.countPages();
    const pageCount = Math.min(5, numPages);
    const images: Uint8Array[] = [];

    for (let i = 0; i < pageCount; i++) {
      const page = document.loadPage(i);
      const image = page
        .toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB)
        .asPNG();
      images.push(await convertToWebP(Buffer.from(image)));
    }

    let foreword = (
      await Promise.all(
        Array.from({ length: Math.min(5, numPages) }, (_, i) =>
          document.loadPage(i).toStructuredText().asText()
        )
      )
    ).join("\n\n");
    if (numPages > 5 && foreword.length < MAX_FOREWORD_LENGTH) {
      foreword += (
        await Promise.all(
          Array.from({ length: Math.min(5, numPages - 5) }, (_, i) =>
            document
              .loadPage(i + 5)
              .toStructuredText()
              .asText()
          )
        )
      ).join("\n\n");
    }
    return { foreword, images, numPages };
  } catch (error) {
    throw new Error(`Failed to extract from PDF: ${error}`);
  }
}