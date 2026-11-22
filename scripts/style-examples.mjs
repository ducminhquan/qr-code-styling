/** Renders the style examples shown in the README. Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const nodeCanvas = require("canvas");

const logo = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#16a34a"/><rect x="16" y="8" width="8" height="24" fill="#fff"/><rect x="8" y="16" width="24" height="8" fill="#fff"/></svg>'
).toString("base64")}`;

const variants = [
  { dotsOptions: { type: "diamond", color: "#7c3aed" } },
  { dotsOptions: { type: "vertical-lines", color: "#0f172a" } },
  { dotsOptions: { type: "horizontal-lines", color: "#0369a1" } },
  {
    frameOptions: { color: "#1d4ed8", radius: 24 },
    labelOptions: { text: "SCAN ME" },
    dotsOptions: { type: "rounded", color: "#1d4ed8" },
    cornersSquareOptions: { type: "rounded" },
    cornersDotOptions: { type: "rounded" }
  },
  {
    frameOptions: { color: "#e11d48", width: 6, radius: 12 },
    image: logo,
    imageOptions: { backgroundColor: "#fff1f2", backgroundRadius: 0.5, margin: 4 },
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { type: "small-square", color: "#be123c" }
  }
];

const size = 220;
const gap = 16;
const sheet = nodeCanvas.createCanvas(variants.length * (size + gap) - gap, size);
const context = sheet.getContext("2d");

for (const [index, options] of variants.entries()) {
  const png = await new QRCodeStyling({
    data: "https://github.com/ducminhquan/qr-code-styling",
    width: size,
    height: size,
    margin: 6,
    nodeCanvas,
    ...options
  }).getRawData("png");
  context.drawImage(await nodeCanvas.loadImage(png), index * (size + gap), 0);
}

fs.writeFileSync(new URL("../src/assets/style_examples.png", import.meta.url), sheet.toBuffer("image/png"));
console.log("Wrote src/assets/style_examples.png");
