/** Renders the shop examples shown in the README (VietQR, GS1 labels on a sheet). Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const { sheet } = require("../lib/print.cjs");
const { Resvg } = require("@resvg/resvg-js");
const jsQR = require("jsqr");
const { payload } = QRCodeStyling;

const brand = { type: "rounded", color: "#1250dc" };
const items = [
  {
    data: payload.vietQR({ bank: "VCB", account: "0011001234567", amount: 150000, message: "Don LC1024" }),
    caption: "VietQR 150.000đ",
    dotsOptions: brand,
    cornersSquareOptions: { type: "extra-rounded", color: "#0a2e8a" }
  },
  {
    data: payload.gs1({ gtin: "8935049500131", lot: "A12", expiry: "2027-06-30" }),
    caption: "GS1 · Lô A12 · HSD 30/06/27",
    dotsOptions: { type: "classy-rounded", color: "#111827" }
  },
  {
    data: payload.gs1({ gtin: "8935049500131", lot: "B07", expiry: "2027-01-15" }),
    caption: "GS1 · Lô B07 · HSD 15/01/27",
    dotsOptions: { type: "extra-rounded", color: "#15803d" },
    cornersSquareOptions: { type: "extra-rounded", color: "#166534" }
  },
  {
    data: "https://nhathuoclongchau.com.vn/p/LC1024",
    caption: "Trang sản phẩm",
    dotsOptions: { type: "fluid", color: "#b45309" }
  }
];

// Every code must scan on its own.
for (const item of items) {
  const svg = (
    await new QRCodeStyling({ ...item, type: "svg", width: 600, height: 600, margin: 30 }).getRawData("svg")
  ).toString();
  const image = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg), { background: "white" }).render();
  const read = jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data;
  if (read !== item.data) throw new Error(`Does not scan: ${item.caption}`);
}

const [page] = await sheet(items, {
  template: { margin: 30 },
  page: { widthMm: 180, heightMm: 58 },
  sizeMm: 38,
  gapMm: 5,
  marginMm: 6,
  captionSizeMm: 3.2,
  cutLines: true
});
const png = new Resvg(page.replace('width="180mm" height="58mm"', 'width="1440" height="464"'), {
  background: "white"
})
  .render()
  .asPng();
fs.writeFileSync("src/assets/retail_examples.png", png);
console.log("src/assets/retail_examples.png");
