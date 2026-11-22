import { describe, it, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import qrcode from "qrcode-generator";
import QRCanvas from "./QRCanvas";
import modes from "../constants/modes";
import mergeDeep from "../tools/merge";
import defaultQRCodeStylingOptions from "./QROptions";
import { expectSameImage } from "../../test/helpers/image";

const asset = (name) => fs.readFileSync(path.resolve(__dirname, "../assets/test", name));

describe("Test QRCanvas class", () => {
  let qr;
  const defaultOptions = mergeDeep(defaultQRCodeStylingOptions, {
    width: 100,
    height: 100,
    data: "TEST",
    qrOptions: {
      mode: modes.alphanumeric
    }
  });
  const defaultImage =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAEUlEQVR42mNk+M+AARiHsiAAcCIKAYwFoQ8AAAAASUVORK5CYII=";

  beforeAll(() => {
    qr = qrcode(defaultOptions.qrOptions.typeNumber, defaultOptions.qrOptions.errorCorrectionLevel);
    qr.addData(defaultOptions.data, defaultOptions.qrOptions.mode);
    qr.make();
  });

  it("Should draw simple qr code", async () => {
    const expectedQRCodeFile = asset("simple_qr.png");
    const canvas = new QRCanvas(defaultOptions);

    await canvas.drawQR(qr);
    await expectSameImage(canvas.getCanvas(), expectedQRCodeFile);
  });
  it("Should draw a qr code with image", async () => {
    const expectedQRCodeFile = asset("simple_qr_with_image.png");
    const canvas = new QRCanvas({
      ...defaultOptions,
      image: defaultImage
    });
    await canvas.drawQR(qr);
    await expectSameImage(canvas.getCanvas(), expectedQRCodeFile);
  });
  it("Should draw a qr code with image margin", async () => {
    const expectedQRCodeFile = asset("simple_qr_with_image_margin.png");
    const canvas = new QRCanvas({
      ...defaultOptions,
      image: defaultImage,
      imageOptions: {
        ...defaultOptions.imageOptions,
        margin: 2
      }
    });
    await canvas.drawQR(qr);
    await expectSameImage(canvas.getCanvas(), expectedQRCodeFile);
  });
  it("Should draw a qr code with image without dots hiding", async () => {
    const expectedQRCodeFile = asset("simple_qr_with_image.png");
    const canvas = new QRCanvas({
      ...defaultOptions,
      image: defaultImage,
      imageOptions: {
        ...defaultOptions.imageOptions,
        hideBackgroundDots: false
      }
    });
    await canvas.drawQR(qr);
    await expectSameImage(canvas.getCanvas(), expectedQRCodeFile);
  });
  it("Should draw a qr code with margin around canvas", async () => {
    const expectedQRCodeFile = asset("simple_qr_with_margin_canvas.png");
    const canvas = new QRCanvas({
      ...defaultOptions,
      margin: 20
    });
    await canvas.drawQR(qr);
    await expectSameImage(canvas.getCanvas(), expectedQRCodeFile);
  });
});
