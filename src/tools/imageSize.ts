/**
 * Reads an image's intrinsic size from its bytes, without a canvas or DOM.
 * Supports PNG, JPEG, GIF, WebP and SVG. Used by the SVG renderer outside the browser.
 */

export interface ImageData {
  bytes: Uint8Array;
  mimeType: string;
}

export interface ImageSize {
  width: number;
  height: number;
}

const decodeBase64 = (base64: string): Uint8Array => {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Very old Node versions without atob.
  return new Uint8Array(Buffer.from(base64, "base64"));
};

export const encodeBase64 = (bytes: Uint8Array): string => {
  if (typeof btoa === "function") {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
};

const sniffMimeType = (bytes: Uint8Array): string => {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).toLowerCase();
  if (head.includes("<svg")) return "image/svg+xml";
  return "application/octet-stream";
};

/** Loads image bytes from a data URL or an http(s) URL (using the global fetch). */
export const loadImageData = async (source: string): Promise<ImageData> => {
  const dataUrl = /^data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,([\s\S]*)$/.exec(source);
  if (dataUrl) {
    const [, mimeType, , base64, payload] = dataUrl;
    const bytes = base64 ? decodeBase64(payload) : new TextEncoder().encode(decodeURIComponent(payload));
    return { bytes, mimeType: mimeType || sniffMimeType(bytes) };
  }

  if (typeof fetch !== "function") {
    throw new Error("Loading an image URL needs a global fetch (Node.js 18+), or pass the image as a data URL.");
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Failed to load image ${source}: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const header = response.headers.get("content-type")?.split(";")[0].trim();
  return { bytes, mimeType: header && header.startsWith("image/") ? header : sniffMimeType(bytes) };
};

export const toDataUrl = ({ bytes, mimeType }: ImageData): string => `data:${mimeType};base64,${encodeBase64(bytes)}`;

function ascii(bytes: Uint8Array, start: number, end: number): string {
  let result = "";
  for (let i = start; i < end && i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
  return result;
}

const uint16BE = (b: Uint8Array, i: number): number => (b[i] << 8) | b[i + 1];
const uint16LE = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8);
const uint24LE = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const uint32BE = (b: Uint8Array, i: number): number =>
  ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;

const svgLength = (value?: string): number | undefined => {
  if (!value) return undefined;
  const match = /^\s*([\d.]+)\s*(px)?\s*$/.exec(value);
  return match ? parseFloat(match[1]) : undefined;
};

const svgSize = (bytes: Uint8Array): ImageSize | null => {
  const text = new TextDecoder().decode(bytes);
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return null;
  const attr = (name: string): string | undefined =>
    new RegExp(`\\s${name}\\s*=\\s*(["'])([^"']*)\\1`, "i").exec(tag)?.[2];
  let width = svgLength(attr("width"));
  let height = svgLength(attr("height"));
  const viewBox = attr("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox && viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    const ratio = viewBox[2] / viewBox[3];
    if (width === undefined && height === undefined) {
      width = viewBox[2];
      height = viewBox[3];
    } else if (width === undefined && height !== undefined) {
      width = height * ratio;
    } else if (height === undefined && width !== undefined) {
      height = width / ratio;
    }
  }
  // Browsers fall back to 300x150 for an SVG without any size information.
  return { width: width ?? 300, height: height ?? 150 };
};

const jpegSize = (b: Uint8Array): ImageSize | null => {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    // Start-of-frame markers carry the size (excluding DHT, JPG and DAC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: uint16BE(b, i + 5), width: uint16BE(b, i + 7) };
    }
    i += 2 + uint16BE(b, i + 2);
  }
  return null;
};

const webpSize = (b: Uint8Array): ImageSize | null => {
  const chunk = ascii(b, 12, 16);
  if (chunk === "VP8 ") return { width: uint16LE(b, 26) & 0x3fff, height: uint16LE(b, 28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: uint24LE(b, 24) + 1, height: uint24LE(b, 27) + 1 };
  return null;
};

export const getImageSize = ({ bytes, mimeType }: ImageData): ImageSize => {
  const type = mimeType === "application/octet-stream" ? sniffMimeType(bytes) : mimeType;
  let size: ImageSize | null = null;

  if (type === "image/png") size = { width: uint32BE(bytes, 16), height: uint32BE(bytes, 20) };
  else if (type === "image/gif") size = { width: uint16LE(bytes, 6), height: uint16LE(bytes, 8) };
  else if (type === "image/jpeg" || type === "image/jpg") size = jpegSize(bytes);
  else if (type === "image/webp") size = webpSize(bytes);
  else if (type === "image/svg+xml") size = svgSize(bytes);

  if (!size || !size.width || !size.height) {
    throw new Error(`Cannot read the size of the image (${type}). Supported: PNG, JPEG, GIF, WebP, SVG.`);
  }
  return size;
};
