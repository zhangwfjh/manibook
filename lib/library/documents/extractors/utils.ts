import sharp from "sharp";

export async function convertToWebP(buffer: Buffer): Promise<Uint8Array> {
  const result = await sharp(buffer)
    .webp({ quality: 80 })
    .toBuffer();
  return new Uint8Array(result);
}