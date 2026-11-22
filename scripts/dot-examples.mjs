/** Renders the connected and decorative dot types shown in the README. Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const nodeCanvas = require("canvas");
const jsQR = require("jsqr");

const variants = [
  { type: "fluid", color: "#1d4ed8" },
  { type: "wave", color: "#0f766e" },
  { type: "blob", color: "#9333ea" },
  { type: "circuit", color: "#15803d" }
];

const size = 220;
const gap = 16;
const sheet = nodeCanvas.createCanvas(variants.length * (size + gap) - gap, size);
const context = sheet.getContext("2d");

for (const [index, dotsOptions] of variants.entries()) {
  const qrCode = new QRCodeStyling({
    data: "https://github.com/ducminhquan/qr-code-styling",
    width: size,
    height: size,
    margin: 8,
    nodeCanvas,
    dotsOptions
  });
  if (!(await qrCode.verify({ decoder: jsQR })).readable) throw new Error(`${dotsOptions.type} does not scan`);
  context.drawImage(await nodeCanvas.loadImage(await qrCode.getRawData("png")), index * (size + gap), 0);
}

fs.writeFileSync(new URL("../src/assets/dot_examples.png", import.meta.url), sheet.toBuffer("image/png"));
console.log("Wrote src/assets/dot_examples.png");
