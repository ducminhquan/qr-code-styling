import { createCanvas, loadImage } from "canvas";

const toSource = (input) => {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string" && input.startsWith("data:")) return input;
  if (input && typeof input.toDataURL === "function") return input.toDataURL();
  throw new Error("Unsupported image input");
};

const readPixels = async (input) => {
  const image = await loadImage(toSource(input));
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data };
};

/**
 * Compares two raster images pixel by pixel instead of comparing encoded PNG bytes,
 * which differ between node-canvas / zlib versions even when the picture is identical.
 * Returns the share of pixels whose channels differ by more than `tolerance`.
 */
export const diffImages = async (actual, expected, tolerance = 8) => {
  const a = await readPixels(actual);
  const b = await readPixels(expected);
  if (a.width !== b.width || a.height !== b.height) {
    return { sizeMismatch: true, ratio: 1, actual: [a.width, a.height], expected: [b.width, b.height] };
  }
  let different = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 4; c++) {
      if (Math.abs(a.data[i + c] - b.data[i + c]) > tolerance) {
        different++;
        break;
      }
    }
  }
  return { sizeMismatch: false, ratio: different / (a.width * a.height) };
};

export const expectSameImage = async (actual, expected, maxRatio = 0.002) => {
  const result = await diffImages(actual, expected);
  if (result.sizeMismatch || result.ratio > maxRatio) {
    throw new Error(`Images differ: ${JSON.stringify(result)}`);
  }
};
