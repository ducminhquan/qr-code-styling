// Option sets shared by the compatibility and server-side tests.
import { createCanvas } from "canvas";

const jpegLogo = (() => {
  const canvas = createCanvas(48, 32);
  const context = canvas.getContext("2d");
  context.fillStyle = "#e11d48";
  context.fillRect(0, 0, 48, 32);
  return canvas.toDataURL("image/jpeg");
})();

export const SVG_LOGO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20" viewBox="0 0 40 20"><rect width="40" height="20" fill="#2563eb"/></svg>'
  ).toString("base64");

export const LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwc2AAAAEUlEQVR42mNk+M+AARiHsiAAcCIKAYwFoQ8AAAAASUVORK5CYII=";
export const linear = {
  type: "linear",
  rotation: Math.PI / 4,
  colorStops: [
    { offset: 0, color: "#1d4ed8" },
    { offset: 1, color: "#16a34a" }
  ]
};
export const radial = {
  type: "radial",
  colorStops: [
    { offset: 0, color: "#f97316" },
    { offset: 1, color: "#7c3aed" }
  ]
};

export const cases = {
  defaults: { data: "https://nhathuoclongchau.com.vn" },
  "unicode data": { data: "Nhà thuốc Long Châu – đơn thuốc #12345", qrOptions: { errorCorrectionLevel: "H" } },
  "numeric, level L, fixed version": { data: "0123456789", qrOptions: { typeNumber: 4, errorCorrectionLevel: "L" } },
  "with margin": { data: "margin", margin: 24 },
  "non-square size": { data: "size", width: 320, height: 240 },
  ...Object.fromEntries(
    ["dots", "rounded", "classy", "classy-rounded", "square", "extra-rounded"].map((type) => [
      `dots: ${type}`,
      { data: "https://fptshop.com.vn", dotsOptions: { type, color: "#0f172a" } }
    ])
  ),
  ...Object.fromEntries(
    ["dot", "square", "extra-rounded"].map((type) => [
      `corner square: ${type}`,
      { data: "corners", cornersSquareOptions: { type, color: "#dc2626" } }
    ])
  ),
  ...Object.fromEntries(
    ["dot", "square"].map((type) => [
      `corner dot: ${type}`,
      { data: "corners", cornersDotOptions: { type, color: "#2563eb" } }
    ])
  ),
  "linear gradient dots + radial background": {
    data: "gradient",
    dotsOptions: { type: "rounded", gradient: linear },
    backgroundOptions: { gradient: radial }
  },
  "gradient corners": {
    data: "gradient corners",
    cornersSquareOptions: { type: "extra-rounded", gradient: radial },
    cornersDotOptions: { type: "dot", gradient: linear }
  },
  "logo, hidden dots": { data: "logo", image: LOGO, imageOptions: { margin: 4, imageSize: 0.3 } },
  "logo, visible dots": { data: "logo", image: LOGO, imageOptions: { hideBackgroundDots: false } },
  "jpeg logo": { data: "jpeg logo", image: jpegLogo, qrOptions: { errorCorrectionLevel: "H" } },
  "svg logo": { data: "svg logo", image: SVG_LOGO, imageOptions: { imageSize: 0.5 } },
  "README example": {
    width: 300,
    height: 300,
    data: "TEST",
    image: LOGO,
    dotsOptions: { color: "#4267b2", type: "rounded" },
    backgroundOptions: { color: "#e9ebee" }
  }
};
