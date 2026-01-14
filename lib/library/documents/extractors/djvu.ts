import fs from "fs";
import { execSync } from "child_process";
import sharp from "sharp";
import { ForewordExtraction } from "../../types";

const MAX_FOREWORD_PAGES = 10;

export async function extractFromDjvu(buffer: Buffer): Promise<ForewordExtraction> {
  let tempFilePath: string | null = null;
  let tmpCoverName: string | null = null;
  try {
    tempFilePath = `temp_djvu_${Date.now()}.djvu`;
    fs.writeFileSync(tempFilePath, buffer);

    const foreword = execSync(
      `djvutxt --page=1-${MAX_FOREWORD_PAGES} "${tempFilePath}"`
    ).toString();
    const numPages = parseInt(
      execSync(`djvused -e n "${tempFilePath}"`).toString()
    );
    tmpCoverName = `temp_djvu_${Date.now()}.tif`;
    execSync(
      `ddjvu -format=tiff -page=1 "${tempFilePath}" "${tmpCoverName}"`
    );
    const tiffBuffer = fs.readFileSync(tmpCoverName);
    const cover = new Uint8Array(await sharp(tiffBuffer).webp({ quality: 80 }).toBuffer());
    if (fs.existsSync(tmpCoverName)) {
      fs.unlinkSync(tmpCoverName);
    }
    return { foreword, images: cover ? [cover] : [], numPages };
  } catch (error) {
    throw new Error(`Failed to extract from DJVU: ${error}`);
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}