// @vitest-environment node
import { createCanvas } from "canvas";
import { getImageSize, loadImageData, toDataUrl } from "./imageSize";

const bytesOf = (canvasMime, width, height) => {
  const canvas = createCanvas(width, height);
  canvas.getContext("2d").fillRect(0, 0, width, height);
  return new Uint8Array(canvas.toBuffer(canvasMime));
};
const header = (size, writes) => {
  const bytes = new Uint8Array(size);
  writes.forEach(([offset, values]) =>
    (typeof values === "string" ? [...values].map((c) => c.charCodeAt(0)) : values).forEach(
      (v, i) => (bytes[offset + i] = v)
    )
  );
  return bytes;
};
const svg = (attributes) =>
  new TextEncoder().encode(`<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attributes}></svg>`);

describe("getImageSize", () => {
  it.each([
    ["png", "image/png", 123, 45],
    ["jpeg", "image/jpeg", 64, 200]
  ])("reads %s", (_name, mimeType, width, height) => {
    expect(getImageSize({ bytes: bytesOf(mimeType, width, height), mimeType })).toEqual({ width, height });
  });

  it("reads gif", () => {
    const bytes = header(13, [
      [0, "GIF89a"],
      [6, [0x2c, 0x01, 0x96, 0x00]]
    ]);
    expect(getImageSize({ bytes, mimeType: "image/gif" })).toEqual({ width: 300, height: 150 });
  });

  it("reads webp (VP8X, VP8L and VP8)", () => {
    const riff = (chunk) => [
      [0, "RIFF"],
      [8, "WEBP"],
      [12, chunk]
    ];
    const vp8x = header(30, [...riff("VP8X"), [24, [99, 0, 0, 49, 0, 0]]]);
    // VP8L: 14 bits width-1, 14 bits height-1 starting at byte 21.
    const bits = (200 - 1) | ((100 - 1) << 14);
    const vp8l = header(30, [
      ...riff("VP8L"),
      [21, [bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >> 24) & 255]]
    ]);
    const vp8 = header(30, [...riff("VP8 "), [26, [64, 0, 32, 0]]]);

    expect(getImageSize({ bytes: vp8x, mimeType: "image/webp" })).toEqual({ width: 100, height: 50 });
    expect(getImageSize({ bytes: vp8l, mimeType: "image/webp" })).toEqual({ width: 200, height: 100 });
    expect(getImageSize({ bytes: vp8, mimeType: "image/webp" })).toEqual({ width: 64, height: 32 });
  });

  it.each([
    ['width="40" height="20"', { width: 40, height: 20 }],
    ['width="40px" height="20px"', { width: 40, height: 20 }],
    ['viewBox="0 0 80 40"', { width: 80, height: 40 }],
    ['width="160" viewBox="0 0 80 40"', { width: 160, height: 80 }],
    ['height="10" viewBox="0,0,80,40"', { width: 20, height: 10 }],
    ["", { width: 300, height: 150 }]
  ])("reads svg with %s", (attributes, expected) => {
    expect(getImageSize({ bytes: svg(attributes), mimeType: "image/svg+xml" })).toEqual(expected);
  });

  it("sniffs the type when the mime type is unknown", () => {
    expect(getImageSize({ bytes: bytesOf("image/png", 7, 9), mimeType: "application/octet-stream" })).toEqual({
      width: 7,
      height: 9
    });
  });

  it("throws on unsupported data", () => {
    expect(() => getImageSize({ bytes: new Uint8Array(32), mimeType: "image/bmp" })).toThrow(/Cannot read the size/);
  });
});

describe("loadImageData", () => {
  it("decodes base64 and url-encoded data URLs", async () => {
    const png = bytesOf("image/png", 3, 2);
    const fromBase64 = await loadImageData(toDataUrl({ bytes: png, mimeType: "image/png" }));
    expect(fromBase64.mimeType).toBe("image/png");
    expect(Array.from(fromBase64.bytes)).toEqual(Array.from(png));

    const fromText = await loadImageData(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg width="5" height="6"/>')}`
    );
    expect(getImageSize(fromText)).toEqual({ width: 5, height: 6 });
  });
});
