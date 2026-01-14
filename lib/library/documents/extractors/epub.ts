import { parseEPUB } from "@/lib/parser";
import { convertToWebP } from "./utils";
import { ForewordExtraction } from "../../types";

const MAX_FOREWORD_PAGES = 10;

export async function extractFromEpub(buffer: Buffer): Promise<ForewordExtraction> {
  try {
    const epub = await parseEPUB(buffer);
    let cover: Uint8Array | null = null;
    if (epub.coverImage) {
      const coverBuffer = Buffer.from(await epub.coverImage.arrayBuffer());
      cover = await convertToWebP(coverBuffer);
    }
    const foreword = (
      await Promise.all(
        Array.from(
          { length: Math.min(MAX_FOREWORD_PAGES, epub.pages.length) },
          (_, i) => epub.pages[i]?.content || ""
        )
      )
    ).join("\n\n");
    const numPages = epub.pages.length;
    return { foreword, images: cover ? [cover] : [], numPages };
  } catch (error) {
    throw new Error(`Failed to extract from EPUB: ${error}`);
  }
}