/** Renders the round QR code examples shown in the README. Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const nodeCanvas = require("canvas");
const jsQR = require("jsqr");

const data = QRCodeStyling.payload.wifi({ ssid: "LongChau-Guest", password: "chamsocsuckhoe" });
const variants = [
  {},
  { dotsOptions: { type: "rounded", color: "#1d4ed8" }, backgroundOptions: { color: "#eff6ff" } },
  {
    dotsOptions: {
      type: "fluid",
      gradient: {
        type: "linear",
        rotation: 0.8,
        colorStops: [
          { offset: 0, color: "#1d4ed8" },
          { offset: 1, color: "#db2777" }
        ]
      }
    }
  },
  { dotsOptions: { type: "dots", color: "#15803d" }, backgroundOptions: { color: "#f0fdf4" } }
];

const size = 240;
const gap = 16;
const sheet = nodeCanvas.createCanvas(variants.length * (size + gap) - gap, size);
const context = sheet.getContext("2d");

for (const [index, options] of variants.entries()) {
  const qrCode = new QRCodeStyling({ data, width: size, height: size, shape: "circle", nodeCanvas, ...options });
  if (!(await qrCode.verify({ decoder: jsQR })).readable) throw new Error(`Example ${index} does not scan`);
  context.drawImage(await nodeCanvas.loadImage(await qrCode.getRawData("png")), index * (size + gap), 0);
}

fs.writeFileSync(new URL("../src/assets/circle_examples.png", import.meta.url), sheet.toBuffer("image/png"));
console.log("Wrote src/assets/circle_examples.png");
