/**
 * Rough throughput benchmark for server-side rendering. Run `npm run build` first.
 *   node scripts/bench.mjs [iterations]
 */
import { createRequire } from "module";
import { performance } from "perf_hooks";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const nodeCanvas = require("canvas");
const { JSDOM } = require("jsdom");
let Resvg;
try {
  ({ Resvg } = require("@resvg/resvg-js"));
} catch {
  Resvg = undefined;
}
let Legacy;
try {
  ({ QRCodeStyling: Legacy } = require("qr-code-styling-node-v1-5/lib/qr-code-styling.common.js"));
} catch {
  Legacy = undefined;
}

const iterations = Number(process.argv[2] || 200);
const base = {
  width: 300,
  height: 300,
  dotsOptions: { type: "rounded", color: "#1d4ed8" },
  cornersSquareOptions: { type: "extra-rounded" },
  backgroundOptions: { color: "#ffffff" }
};

const run = async (label, make, extension) => {
  // Warm up, then measure.
  for (let i = 0; i < 10; i++) await make(`warmup-${i}`).getRawData(extension);
  const start = performance.now();
  for (let i = 0; i < iterations; i++)
    await make(`https://nhathuoclongchau.com.vn/don-thuoc/${i}`).getRawData(extension);
  const ms = (performance.now() - start) / iterations;
  console.log(`${label.padEnd(44)} ${ms.toFixed(2).padStart(8)} ms/QR ${(1000 / ms).toFixed(0).padStart(7)} QR/s`);
};

console.log(`${iterations} QR codes per case, Node ${process.version}\n`);
if (Legacy) await run("1.5.0  svg  (jsdom)", (data) => new Legacy({ ...base, data, type: "svg", jsdom: JSDOM }), "svg");
await run("now    svg  (jsdom)", (data) => new QRCodeStyling({ ...base, data, type: "svg", jsdom: JSDOM }), "svg");
await run("now    svg  (no dependencies)", (data) => new QRCodeStyling({ ...base, data, type: "svg" }), "svg");
if (Legacy) await run("1.5.0  png  (node-canvas)", (data) => new Legacy({ ...base, data, nodeCanvas }), "png");
await run("now    png  (node-canvas)", (data) => new QRCodeStyling({ ...base, data, nodeCanvas }), "png");
if (Resvg) await run("now    png  (resvg)", (data) => new QRCodeStyling({ ...base, data, resvg: Resvg }), "png");
