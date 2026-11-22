/** Renders the QR art examples shown in the README. Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const nodeCanvas = require("canvas");

const picture = `data:image/jpeg;base64,${fs.readFileSync(new URL("../test/fixtures/landscape.jpg", import.meta.url)).toString("base64")}`;
const variants = [
  { art: { image: picture } },
  { art: { image: picture, colored: true } },
  { art: { image: picture, mode: "colorize" }, dotsOptions: { type: "rounded" } },
  {
    art: { image: picture, mode: "colorize" },
    dotsOptions: { type: "dots" },
    cornersSquareOptions: { type: "extra-rounded" }
  }
];

const size = 240;
const gap = 16;
const sheet = nodeCanvas.createCanvas(variants.length * (size + gap) - gap, size);
const context = sheet.getContext("2d");

for (const [index, options] of variants.entries()) {
  const png = await new QRCodeStyling({
    data: "https://github.com/ducminhquan/qr-code-styling",
    width: size,
    height: size,
    margin: 8,
    nodeCanvas,
    qrOptions: { errorCorrectionLevel: "H" },
    ...options
  }).getRawData("png");
  context.drawImage(await nodeCanvas.loadImage(png), index * (size + gap), 0);
}

fs.writeFileSync(new URL("../src/assets/art_examples.png", import.meta.url), sheet.toBuffer("image/png"));
console.log("Wrote src/assets/art_examples.png");
