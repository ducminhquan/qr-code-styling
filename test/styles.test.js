// @vitest-environment node
import nodeCanvas from "canvas";
import jsQR from "jsqr";
import { Resvg } from "@resvg/resvg-js";
import QRCodeStyling from "../src/index";
import { LOGO, SVG_LOGO } from "./helpers/cases";
import { diffImages } from "./helpers/image";

const SHORT = "hello";
const LONG = "https://nhathuoclongchau.com.vn/san-pham/thuoc-abc-123?utm_source=qr&utm_medium=print";

const styles = {
  diamond: { dotsOptions: { type: "diamond" } },
  "small-square": { dotsOptions: { type: "small-square" } },
  "vertical-lines": { dotsOptions: { type: "vertical-lines" } },
  "horizontal-lines": { dotsOptions: { type: "horizontal-lines" } },
  fluid: { dotsOptions: { type: "fluid", color: "#1d4ed8" } },
  "rounded corners": {
    dotsOptions: { type: "rounded" },
    cornersSquareOptions: { type: "rounded" },
    cornersDotOptions: { type: "rounded" }
  },
  "frame + label": {
    frameOptions: { color: "#1d4ed8", radius: 24 },
    labelOptions: { text: "QUÉT ĐỂ MUA" },
    dotsOptions: { type: "rounded", color: "#1d4ed8" }
  },
  "label on top, no frame": { labelOptions: { text: "Nhà thuốc", position: "top" }, margin: 10 },
  "logo plate": {
    image: SVG_LOGO,
    imageOptions: { backgroundColor: "#fff1f2", backgroundRadius: 0.5, margin: 4 },
    qrOptions: { errorCorrectionLevel: "H" }
  }
};

const render = (options) => ({ data: LONG, width: 320, height: 320, ...options });

describe("New styles", () => {
  describe.each(Object.entries(styles))("%s", (_name, options) => {
    it.each([SHORT, LONG])("scans as canvas (%s)", async (data) => {
      const result = await new QRCodeStyling({ ...render(options), data, nodeCanvas }).verify({ decoder: jsQR });
      expect(result).toMatchObject({ readable: true, decoded: data });
    });

    it("scans as SVG (rendered by resvg)", async () => {
      const result = await new QRCodeStyling({ ...render(options), resvg: Resvg }).verify({ decoder: jsQR });
      expect(result.readable).toBe(true);
    });

    it("SVG and canvas show the same picture", async () => {
      const qrCode = new QRCodeStyling({ ...render(options), nodeCanvas });
      const svg = (await qrCode.getRawData("svg")).toString();
      const fromSvg = Buffer.from(new Resvg(QRCodeStyling._normalizeSVGForResvg(svg)).render().asPng());
      const diff = await diffImages(fromSvg, await qrCode.getRawData("png"), 48);
      expect(diff.sizeMismatch).toBe(false);
      // Text is rasterized by different engines, so allow a little more where a label is drawn.
      expect(diff.ratio).toBeLessThan(options.labelOptions ? 0.06 : 0.03);
    });
  });

  it("SVG is identical with jsdom and without it", async () => {
    const { JSDOM } = await import("jsdom");
    for (const options of Object.values(styles)) {
      const viaJsdom = await new QRCodeStyling({
        ...render(options),
        type: "svg",
        jsdom: JSDOM,
        nodeCanvas
      }).getRawData("svg");
      const virtual = await new QRCodeStyling({ ...render(options), type: "svg" }).getRawData("svg");
      expect(virtual.toString()).toEqual(viaJsdom.toString());
    }
  });

  it("new dot types keep solid finder patterns unless a corner type is chosen", async () => {
    const solid = await new QRCodeStyling({ data: SHORT, nodeCanvas, dotsOptions: { type: "diamond" } }).getRawData(
      "png"
    );
    const explicit = await new QRCodeStyling({
      data: SHORT,
      nodeCanvas,
      dotsOptions: { type: "diamond" },
      cornersSquareOptions: { type: "square" },
      cornersDotOptions: { type: "square" }
    }).getRawData("png");
    expect((await diffImages(solid, explicit, 0)).ratio).toBe(0);
  });

  it("the logo plate is drawn behind the logo", async () => {
    const options = {
      data: LONG,
      nodeCanvas,
      image: LOGO,
      imageOptions: { margin: 10 },
      qrOptions: { errorCorrectionLevel: "H" }
    };
    const plain = await new QRCodeStyling(options).getRawData("png");
    const plated = await new QRCodeStyling({
      ...options,
      backgroundOptions: { color: "#ffffff" },
      imageOptions: { margin: 10, backgroundColor: "#ff0000" }
    }).getRawData("png");
    expect((await diffImages(plain, plated, 8)).ratio).toBeGreaterThan(0.005);
  });

  it("refuses a frame that leaves no room for the code", async () => {
    const qrCode = new QRCodeStyling({ data: SHORT, width: 40, height: 40, nodeCanvas, frameOptions: { width: 30 } });
    await expect(qrCode.getRawData("png")).rejects.toThrow(/no room/);
  });
});
