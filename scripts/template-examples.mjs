/** Renders the shaped-code and VietQR card examples shown in the README. Run `npm run build` first. */
import { createRequire } from "module";
import fs from "fs";

const require = createRequire(import.meta.url);
const QRCodeStyling = require("../lib/qr-code-styling.js");
const { Resvg } = require("@resvg/resvg-js");
const jsQR = require("jsqr");
const { templates } = QRCodeStyling;

/** Renders options to RGBA and checks the code scans. */
const render = async (options, width) => {
  const svg = (await new QRCodeStyling({ ...options, type: "svg" }).getRawData("svg")).toString();
  const image = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg), {
    fitTo: { mode: "width", value: width },
    background: "#f3f4f6"
  }).render();
  const big = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg), { background: "white" }).render();
  if (jsQR(new Uint8ClampedArray(big.pixels), big.width, big.height)?.data !== options.data) {
    throw new Error(`Does not scan: ${JSON.stringify(options).slice(0, 80)}`);
  }
  return image;
};

/** Puts images side by side on a light grey strip, as one PNG via an SVG wrapper. */
const strip = (images, gap, file) => {
  const height = Math.max(...images.map((image) => image.height)) + 2 * gap;
  let x = gap;
  const parts = images.map((image) => {
    const part = `<image x="${x}" y="${gap}" width="${image.width}" height="${image.height}" href="data:image/png;base64,${Buffer.from(image.asPng()).toString("base64")}"/>`;
    x += image.width + gap;
    return part;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${height}"><rect width="${x}" height="${height}" fill="#f3f4f6"/>${parts.join("")}</svg>`;
  fs.writeFileSync(file, new Resvg(svg).render().asPng());
  console.log(file);
};

const data = "https://github.com/ducminhquan/qr-code-styling";
const shapes = [
  { shape: "heart", dotsOptions: { type: "rounded", color: "#e11d48" }, backgroundOptions: { color: "#fff1f2" } },
  {
    shape: "hexagon",
    dotsOptions: { type: "classy-rounded", color: "#1250dc" },
    backgroundOptions: { color: "#eff6ff" }
  },
  { shape: "octagon", dotsOptions: { type: "fluid", color: "#15803d" }, backgroundOptions: { color: "#f0fdf4" } },
  {
    shape: "diamond",
    dotsOptions: { type: "extra-rounded", color: "#7c3aed" },
    backgroundOptions: { color: "#f5f3ff" }
  }
];
const shapeImages = [];
for (const options of shapes) shapeImages.push(await render({ data, width: 600, height: 600, ...options }, 240));
strip(shapeImages, 16, "src/assets/shape_examples.png");

const logo =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="24" fill="#0b4ea2"/>' +
      '<path d="M30 50h40M50 30v40" stroke="#fff" stroke-width="14" stroke-linecap="round"/></svg>'
  ).toString("base64");
const cards = [
  {
    bank: "VCB",
    account: "0011001234567",
    amount: 150000,
    accountName: "Nhà thuốc Long Châu",
    message: "Don LC1024",
    logo
  },
  { bank: "TCB", account: "19033334445556", amount: 89000, accountName: "Nguyễn Văn An", theme: "red" },
  { bank: "MB", account: "0123456789", accountName: "Cửa hàng ABC", theme: "green" },
  {
    bank: "BIDV",
    account: "21410000123456",
    amount: 2500000,
    accountName: "Trần Thị B",
    theme: "purple",
    title: "Chuyển khoản nhanh"
  }
];
const cardImages = [];
for (const card of cards) cardImages.push(await render(templates.vietQR(card), 240));
strip(cardImages, 16, "src/assets/vietqr_examples.png");
