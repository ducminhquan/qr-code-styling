// @vitest-environment node
/**
 * Guards backward compatibility: every case below is rendered by the current source and by the
 * published qr-code-styling-node@1.5.0, and the outputs must match. A change that intentionally
 * alters rendering must be opt-in (a new option), never a change to what existing options produce.
 */
import nodeCanvas from "canvas";
import { JSDOM } from "jsdom";
import QRCodeStyling from "../src/index";
import { diffImages } from "./helpers/image";

const { QRCodeStyling: LegacyQRCodeStyling } = require("qr-code-styling-node-v1-5/lib/qr-code-styling.common.js");

const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAEUlEQVR42mNk+M+AARiHsiAAcCIKAYwFoQ8AAAAASUVORK5CYII=";
const linear = {
  type: "linear",
  rotation: Math.PI / 4,
  colorStops: [
    { offset: 0, color: "#1d4ed8" },
    { offset: 1, color: "#16a34a" }
  ]
};
const radial = {
  type: "radial",
  colorStops: [
    { offset: 0, color: "#f97316" },
    { offset: 1, color: "#7c3aed" }
  ]
};

const cases = {
  defaults: { data: "https://nhathuoclongchau.com.vn" },
  "unicode data": { data: "Nhà thuốc Long Châu – đơn thuốc #12345", qrOptions: { errorCorrectionLevel: "H" } },
  "numeric, level L, fixed version": { data: "0123456789", qrOptions: { typeNumber: 4, errorCorrectionLevel: "L" } },
  "with margin": { data: "margin", margin: 24 },
  "non-square size": { data: "size", width: 320, height: 240 },
  ...Object.fromEntries(
    ["dots", "rounded", "classy", "classy-rounded", "square", "extra-rounded"].map((type) => [
      `dots: ${type}`,
      { data: "https://fptshop.com.vn", dotsOptions: { type, color: "#0f172a" } }
    ])
  ),
  ...Object.fromEntries(
    ["dot", "square", "extra-rounded"].map((type) => [
      `corner square: ${type}`,
      { data: "corners", cornersSquareOptions: { type, color: "#dc2626" } }
    ])
  ),
  ...Object.fromEntries(
    ["dot", "square"].map((type) => [
      `corner dot: ${type}`,
      { data: "corners", cornersDotOptions: { type, color: "#2563eb" } }
    ])
  ),
  "linear gradient dots + radial background": {
    data: "gradient",
    dotsOptions: { type: "rounded", gradient: linear },
    backgroundOptions: { gradient: radial }
  },
  "gradient corners": {
    data: "gradient corners",
    cornersSquareOptions: { type: "extra-rounded", gradient: radial },
    cornersDotOptions: { type: "dot", gradient: linear }
  },
  "logo, hidden dots": { data: "logo", image: LOGO, imageOptions: { margin: 4, imageSize: 0.3 } },
  "logo, visible dots": { data: "logo", image: LOGO, imageOptions: { hideBackgroundDots: false } },
  "README example": {
    width: 300,
    height: 300,
    data: "TEST",
    image: LOGO,
    dotsOptions: { color: "#4267b2", type: "rounded" },
    backgroundOptions: { color: "#e9ebee" }
  }
};

describe("Rendering is identical to qr-code-styling-node@1.5.0", () => {
  describe.each(Object.entries(cases))("%s", (_name, options) => {
    it("svg", async () => {
      const svgOptions = { ...options, type: "svg", jsdom: JSDOM, nodeCanvas };
      const current = await new QRCodeStyling(svgOptions).getRawData("svg");
      const legacy = await new LegacyQRCodeStyling(svgOptions).getRawData("svg");

      expect(current.toString()).toEqual(legacy.toString());
    });

    it("canvas png", async () => {
      const canvasOptions = { ...options, type: "canvas", nodeCanvas };
      const current = await new QRCodeStyling(canvasOptions).getRawData("png");
      const legacy = await new LegacyQRCodeStyling(canvasOptions).getRawData("png");

      expect(await diffImages(current, legacy)).toEqual({ sizeMismatch: false, ratio: 0 });
    });
  });
});
