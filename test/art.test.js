// @vitest-environment node
import fs from "fs";
import path from "path";
import nodeCanvas from "canvas";
import jsQR from "jsqr";
import { Resvg } from "@resvg/resvg-js";
import QRCodeStyling from "../src/index";
import { LOGO, linear } from "./helpers/cases";
import { diffImages } from "./helpers/image";

const PICTURE = `data:image/jpeg;base64,${fs.readFileSync(path.resolve(__dirname, "fixtures/landscape.jpg")).toString("base64")}`;
const DATA = "https://nhathuoclongchau.com.vn/san-pham/thuoc-abc-123";
const base = { data: DATA, width: 300, height: 300, margin: 10 };

const variants = {
  halftone: { art: { image: PICTURE } },
  "halftone, colored": { art: { image: PICTURE, colored: true } },
  "halftone, gradient + logo": {
    art: { image: PICTURE },
    dotsOptions: { gradient: linear },
    image: LOGO,
    imageOptions: { imageSize: 0.3 }
  },
  colorize: { art: { image: PICTURE, mode: "colorize" } },
  "colorize, round dots, no background": {
    art: { image: PICTURE, mode: "colorize", background: false },
    dotsOptions: { type: "dots" }
  },
  "colorize, corner colors": {
    art: { image: PICTURE, mode: "colorize" },
    cornersSquareOptions: { type: "extra-rounded", color: "#1d4ed8" },
    cornersDotOptions: { type: "dot", color: "#1d4ed8" }
  },
  blend: { art: { image: PICTURE, mode: "blend" } },
  "blend, round dots": { art: { image: PICTURE, mode: "blend" }, dotsOptions: { type: "dots" } },
  "blend, fluid dots, low contrast": {
    art: { image: PICTURE, mode: "blend", contrast: 0.3 },
    dotsOptions: { type: "fluid" }
  },
  "blend, placed in a wide picture": {
    width: 600,
    height: 400,
    art: { image: PICTURE, mode: "blend", placement: { x: 300, y: 100, size: 240 } },
    dotsOptions: { type: "dots" }
  }
};

describe("QR art", () => {
  describe.each(Object.entries(variants))("%s", (_name, options) => {
    it.each(["L", "M", "Q", "H"])("scans at error correction %s with default settings", async (level) => {
      const qrCode = new QRCodeStyling({ ...base, ...options, nodeCanvas, qrOptions: { errorCorrectionLevel: level } });
      const result = await qrCode.verify({ decoder: jsQR });

      expect(result).toMatchObject({ readable: true, decoded: DATA });
    });

    it("draws the same picture as SVG and as canvas", async () => {
      const qrCode = new QRCodeStyling({ ...base, ...options, nodeCanvas, qrOptions: { errorCorrectionLevel: "H" } });
      const svg = (await qrCode.getRawData("svg")).toString();
      const fromSvg = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg)).render().asPng();
      const fromCanvas = await qrCode.getRawData("png");

      const diff = await diffImages(Buffer.from(fromSvg), fromCanvas, 48);
      expect(diff.sizeMismatch).toBe(false);
      expect(diff.ratio).toBeLessThan(0.03);
    });
  });

  it("changes the output compared with the same code without art", async () => {
    const withArt = await new QRCodeStyling({ ...base, nodeCanvas, art: { image: PICTURE } }).getRawData("png");
    const without = await new QRCodeStyling({ ...base, nodeCanvas }).getRawData("png");
    expect((await diffImages(withArt, without)).ratio).toBeGreaterThan(0.2);
  });

  it("blend: finders take their color from the picture unless a corner color is set", async () => {
    const qrCode = new QRCodeStyling({ ...base, type: "svg", nodeCanvas, art: { image: PICTURE, mode: "blend" } });
    const svg = (await qrCode.getRawData("svg")).toString();
    const finderFills = svg.match(/clip-path-corners-square-color-[^"]*'\)" fill="[^"]*"/g) || [];
    expect(finderFills).toHaveLength(3);
    finderFills.forEach((fill) => expect(fill).toMatch(/fill="rgb\(/));
    const colored = new QRCodeStyling({
      ...base,
      type: "svg",
      nodeCanvas,
      art: { image: PICTURE, mode: "blend" },
      cornersSquareOptions: { color: "#1d4ed8" }
    });
    expect((await colored.getRawData("svg")).toString()).toContain("#1d4ed8");
  });

  it("blend: keeps the picture outside the code with placement", async () => {
    const options = { ...base, width: 600, height: 400, nodeCanvas };
    const placed = new QRCodeStyling({
      ...options,
      art: { image: PICTURE, mode: "blend", placement: { x: 300, y: 100, size: 240 } }
    });
    const canvas = nodeCanvas.createCanvas(600, 400);
    const context = canvas.getContext("2d");
    context.drawImage(await nodeCanvas.loadImage(await placed.getRawData("png")), 0, 0);
    const picture = nodeCanvas.createCanvas(600, 400);
    const pictureContext = picture.getContext("2d");
    const image = await nodeCanvas.loadImage(PICTURE);
    const scale = Math.max(600 / image.width, 400 / image.height);
    pictureContext.drawImage(
      image,
      (image.width - 600 / scale) / 2,
      (image.height - 400 / scale) / 2,
      600 / scale,
      400 / scale,
      0,
      0,
      600,
      400
    );
    // The left part of the picture, far from the code, is untouched.
    const a = context.getImageData(0, 0, 250, 400).data;
    const b = pictureContext.getImageData(0, 0, 250, 400).data;
    let different = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8) different++;
    expect(different / (a.length / 4)).toBeLessThan(0.01);
  });

  it("can be removed again with update()", async () => {
    const qrCode = new QRCodeStyling({ ...base, nodeCanvas, art: { image: PICTURE } });
    qrCode.update({ art: undefined });
    const plain = await new QRCodeStyling({ ...base, nodeCanvas }).getRawData("png");
    expect((await diffImages(await qrCode.getRawData("png"), plain, 0)).ratio).toBe(0);
  });

  it("explains that a canvas is needed on a server", async () => {
    const qrCode = new QRCodeStyling({ ...base, type: "svg", art: { image: PICTURE } });
    await expect(qrCode.getRawData("svg")).rejects.toThrow(/nodeCanvas/);
  });
});

describe("verify()", () => {
  it("confirms a plain QR code", async () => {
    const result = await new QRCodeStyling({ data: DATA, nodeCanvas }).verify({ decoder: jsQR });
    expect(result).toEqual({ readable: true, decoded: DATA, contrast: undefined, attempts: 1 });
  });

  it("works without node-canvas through resvg", async () => {
    const result = await new QRCodeStyling({ data: DATA, resvg: Resvg }).verify({ decoder: jsQR });
    expect(result.readable).toBe(true);
  });

  it("reports a code that cannot be scanned", async () => {
    const qrCode = new QRCodeStyling({ data: DATA, nodeCanvas, dotsOptions: { color: "#f4f4f4" } });
    expect((await qrCode.verify({ decoder: jsQR })).readable).toBe(false);
  });

  it("raises art contrast until the code scans when adjust is on", async () => {
    const options = {
      ...base,
      nodeCanvas,
      qrOptions: { errorCorrectionLevel: "L" },
      art: { image: PICTURE, mode: "colorize", contrast: 0.2 }
    };
    expect((await new QRCodeStyling(options).verify({ decoder: jsQR })).readable).toBe(false);

    const qrCode = new QRCodeStyling(options);
    const result = await qrCode.verify({ decoder: jsQR, adjust: true });
    expect(result.readable).toBe(true);
    expect(result.contrast).toBeGreaterThan(0.2);
    expect(result.attempts).toBeGreaterThan(1);
    // The instance keeps the readable settings.
    expect(qrCode._options.art.contrast).toBe(result.contrast);
  });

  it("needs a decoder", async () => {
    await expect(new QRCodeStyling({ data: DATA, nodeCanvas }).verify({})).rejects.toThrow(/decoder/);
  });
});
