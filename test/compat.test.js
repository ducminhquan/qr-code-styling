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
import { cases } from "./helpers/cases";

const { QRCodeStyling: LegacyQRCodeStyling } = require("qr-code-styling-node-v1-5/lib/qr-code-styling.common.js");

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
