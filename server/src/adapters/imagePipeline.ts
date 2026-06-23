import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

const prepareOutput = async (path: string) => mkdir(dirname(path), { recursive: true });

export const resizeImage = async (input: string, output: string, width: number, height?: number) => {
  await prepareOutput(output);
  await sharp(input).resize({ width, height, fit: "inside", withoutEnlargement: true }).toFile(output);
  return output;
};

export const cropImage = async (input: string, output: string, width: number, height: number) => {
  await prepareOutput(output);
  await sharp(input).resize({ width, height, fit: "cover" }).toFile(output);
  return output;
};

export const addTransparentPadding = async (input: string, output: string, padding: number) => {
  await prepareOutput(output);
  await sharp(input).extend({
    top: padding,
    right: padding,
    bottom: padding,
    left: padding,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toFile(output);
  return output;
};

export const compositeImages = async (base: string, overlay: string, output: string) => {
  await prepareOutput(output);
  await sharp(base).composite([{ input: overlay, gravity: "center" }]).toFile(output);
  return output;
};

export const placeholderMockupMetadata = (taskId: string) => ({
  taskId,
  kind: "placeholder",
  generated: false,
  reason: "No source image was supplied.",
});
