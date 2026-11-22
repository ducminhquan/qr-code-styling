/** Renders the "blend" QR art examples shown in the README. Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const nodeCanvas = require("canvas");
const jsQR = require("jsqr");

const picture = `data:image/jpeg;base64,${fs.readFileSync(new URL("../test/fixtures/landscape.jpg", import.meta.url)).toString("base64")}`;
const data = "https://github.com/ducminhquan/qr-code-styling";
const size = 240;
const gap = 16;
const width = 3 * size + 2 * gap;
const wideHeight = 300;

const squares = [
  { art: { image: picture, mode: "blend" } },
  { art: { image: picture, mode: "blend" }, dotsOptions: { type: "dots" } },
  { art: { image: picture, mode: "blend", contrast: 0.4 }, dotsOptions: { type: "fluid" } }
];
const wide = {
  width,
  height: wideHeight,
  art: { image: picture, mode: "blend", placement: { x: width - 250, y: 40, size: 220 } },
  dotsOptions: { type: "dots" }
};

const sheet = nodeCanvas.createCanvas(width, size + gap + wideHeight);
const context = sheet.getContext("2d");

const render = async (options) => {
  const qrCode = new QRCodeStyling({
    data,
    width: size,
    height: size,
    margin: 8,
    nodeCanvas,
    qrOptions: { errorCorrectionLevel: "M" },
    ...options
  });
  const { readable } = await qrCode.verify({ decoder: jsQR });
  if (!readable)
    throw new Error(
      `Example does not scan: ${JSON.stringify({ ...options, art: { ...options.art, image: undefined } })}`
    );
  return nodeCanvas.loadImage(await qrCode.getRawData("png"));
};

for (const [index, options] of squares.entries()) {
  context.drawImage(await render(options), index * (size + gap), 0);
}
context.drawImage(await render(wide), 0, size + gap);

fs.writeFileSync(new URL("../src/assets/blend_examples.png", import.meta.url), sheet.toBuffer("image/png"));
console.log("Wrote src/assets/blend_examples.png");
