// @vitest-environment node
/**
 * Bugs found by driving the playground: shaped codes inside a frame or with labels, the shaped background
 * when modules are rounded down, long label lines, label contrast, and verify() on a transparent background.
 */
import nodeCanvas from "canvas";
import jsQR from "jsqr";
import QRCodeStyling, { templates } from "../src/index";
import getFrameLayout from "../src/tools/frameLayout";
import { getShapeBox } from "../src/tools/qrArea";
import sanitizeOptions from "../src/tools/sanitizeOptions";
import mergeDeep from "../src/tools/merge";
import defaultOptions from "../src/core/QROptions";

const card = { bank: "TPB", account: "00003087002", amount: 150000, accountName: "Nguyen Duc Minh Quan" };
const required = (options) => sanitizeOptions(mergeDeep(defaultOptions, options));

const pixelsOf = async (options) => {
  const png = await new QRCodeStyling({ ...options, type: "canvas", nodeCanvas }).getRawData("png");
  const image = await nodeCanvas.loadImage(png);
  const canvas = nodeCanvas.createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return { context, width: image.width, height: image.height };
};
const rgb = (context, x, y) => Array.from(context.getImageData(x, y, 1, 1).data.slice(0, 3));

describe("shaped code in a frame (canvas)", () => {
  it.each(["circle", "heart", "hexagon", "octagon", "diamond"])(
    "keeps the card panel white around a %s code",
    async (shape) => {
      const options = { ...templates.vietQR(card), shape };
      const { context, width } = await pixelsOf(options);
      const layout = getFrameLayout(required(options));
      const band = layout.labels.find((label) => label.position === "bottom").band;
      // Corners of the panel next to the code, and the label band: all white, not the frame color.
      const t = layout.frame.thickness;
      expect(rgb(context, t + 3, layout.qr.y + 3)).toEqual([255, 255, 255]);
      expect(rgb(context, width - t - 4, layout.qr.y + layout.qr.size - 4)).toEqual([255, 255, 255]);
      expect(rgb(context, band.x + 4, band.y + band.height / 2)).toEqual([255, 255, 255]);
    }
  );

  it("draws the same panel as SVG", async () => {
    const options = { ...templates.vietQR(card), shape: "circle" };
    const svg = (await new QRCodeStyling({ ...options, type: "svg" }).getRawData("svg")).toString();
    expect(svg).not.toContain('id="clip-path-background-color"');
  });

  it("labels without a frame get a full background, not a shaped one", async () => {
    const options = { width: 300, height: 300, data: "hello", shape: "heart", labelOptions: { text: "SCAN ME" } };
    const { context } = await pixelsOf(options);
    expect(rgb(context, 2, 2)).toEqual([255, 255, 255]);
  });
});

describe("shaped background follows the dots", () => {
  it("shrinks with the grid when modules are rounded down", () => {
    const options = required({ width: 300, height: 300, margin: 10, data: "x", shape: "heart" });
    const box = getShapeBox(options, 77);
    expect(box.size).toBeLessThan(300);
    expect(Math.abs(box.x + box.size / 2 - 150)).toBeLessThanOrEqual(1);
  });

  it("fills the image when the grid fits exactly", () => {
    const options = required({ width: 300, height: 300, margin: 0, data: "x", shape: "hexagon" });
    for (const count of [21, 25, 29, 33]) {
      expect(getShapeBox(options, count).size).toBeLessThanOrEqual(300);
    }
  });

  it("a long code in a heart still scans", async () => {
    const data = "BEGIN:VCARD\n" + "x".repeat(140);
    const { context, width, height } = await pixelsOf({ width: 600, height: 600, margin: 10, data, shape: "heart" });
    const image = context.getImageData(0, 0, width, height);
    expect(jsQR(image.data, width, height)?.data).toBe(data);
  });
});

describe("label lines", () => {
  it("shrinks a line that would not fit the card", () => {
    const options = required({
      ...templates.vietQR({ ...card, accountName: "Công ty Cổ phần Dược phẩm FPT Long Châu chi nhánh Hà Nội" })
    });
    const layout = getFrameLayout(options);
    const bottom = layout.labels.find((label) => label.position === "bottom");
    const name = bottom.lines.find((line) => line.text.startsWith("CÔNG TY"));
    expect(name.fontSize).toBeLessThan(Math.round(600 * 0.045));
    expect(name.font).toContain(`${name.fontSize}px`);
  });

  it("leaves short lines alone", () => {
    const layout = getFrameLayout(required(templates.vietQR(card)));
    const bottom = layout.labels.find((label) => label.position === "bottom");
    expect(bottom.lines[0].fontSize).toBe(Math.round(600 * 0.075));
  });
});

describe("check()", () => {
  it("warns about label text that is hard to read", () => {
    const result = QRCodeStyling.check({
      data: "hi",
      frameOptions: { color: "#1e3a8a" },
      labelOptions: { text: "SCAN ME", color: "#111827" }
    });
    expect(result.issues.map((issue) => issue.code)).toContain("label-contrast");
  });

  it("is quiet for the VietQR cards", () => {
    for (const theme of ["blue", "red", "green", "purple", "orange", "black"]) {
      const codes = QRCodeStyling.check(templates.vietQR({ ...card, theme })).issues.map((issue) => issue.code);
      expect(codes).not.toContain("label-contrast");
    }
  });
});

describe("verify()", () => {
  it("reads a code on a transparent background", async () => {
    const qr = new QRCodeStyling({
      data: "transparent",
      type: "canvas",
      nodeCanvas,
      backgroundOptions: { color: "transparent" }
    });
    const result = await qr.verify({ decoder: jsQR });
    expect(result.readable).toBe(true);
  });
});
