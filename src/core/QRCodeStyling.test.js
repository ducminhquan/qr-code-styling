import { describe, it, expect } from "vitest";
import QRCodeStyling from "./QRCodeStyling";
import fs from "fs";
import path from "path";
import nodeCanvas from "canvas";
import { JSDOM } from "jsdom";
import { expectSameImage } from "../../test/helpers/image";

const asset = (name) => fs.readFileSync(path.resolve(__dirname, "../assets/test", name));
const readmeOptions = {
  width: 300,
  height: 300,
  data: "TEST",
  image:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAEUlEQVR42mNk+M+AARiHsiAAcCIKAYwFoQ8AAAAASUVORK5CYII=",
  dotsOptions: {
    color: "#4267b2",
    type: "rounded"
  },
  backgroundOptions: {
    color: "#e9ebee"
  }
};

describe("Test QRCodeStyling class", () => {
  it("The README example should work correctly", async () => {
    const qrCode = new QRCodeStyling(readmeOptions);
    document.body.innerHTML = "<div id='container'></div>";

    qrCode.append(document.getElementById("container"));
    await qrCode._canvasDrawingPromise;
    await expectSameImage(qrCode._canvas.getCanvas(), asset("image_from_readme.png"));
  });

  it("Compatible with node-canvas", async () => {
    const qrCode = new QRCodeStyling({ ...readmeOptions, nodeCanvas });
    const buffer = await qrCode.getRawData("png");

    expect(Buffer.isBuffer(buffer)).toBe(true);
    await expectSameImage(buffer, asset("image_from_readme.png"));
  });

  it("Compatible with jsdom", async () => {
    const qrCode = new QRCodeStyling({ ...readmeOptions, jsdom: JSDOM, type: "svg" });
    const buffer = await qrCode.getRawData("svg");

    expect(buffer.toString()).toEqual(asset("image_from_readme.svg").toString());
  });
});
