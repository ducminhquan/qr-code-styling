// @vitest-environment node
import nodeCanvas from "canvas";
import jsQR from "jsqr";
import QRCodeStyling from "../src/index";

const DATA = "https://nhathuoclongchau.com.vn";

/** Example plugin: a colored ring around the code, drawn in the margin. */
const ring = (color) => ({
  name: "ring",
  configure: (options) => (options.margin < 24 ? { margin: 24 } : undefined),
  afterDraw: ({ type, area, context, svg, document }) => {
    const cx = area.x + area.size / 2;
    const cy = area.y + area.size / 2;
    const r = (area.size / 2) * Math.SQRT2 + 4;
    if (type === "canvas") {
      context.beginPath();
      context.arc(cx, cy, Math.min(r, cx - 2), 0, Math.PI * 2);
      context.strokeStyle = color;
      context.lineWidth = 3;
      context.stroke();
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(Math.min(r, cx - 2)));
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", color);
      svg.appendChild(circle);
    }
  }
});

describe("plugins", () => {
  it("configure() changes the options before drawing", () => {
    const qrCode = new QRCodeStyling({ data: DATA, plugins: [ring("#e11d48")] });
    expect(qrCode._options.margin).toBe(24);
    qrCode.update({ data: "again" });
    expect(qrCode._options.margin).toBe(24);
  });

  it("afterDraw() draws on the canvas, and the code still scans", async () => {
    const qrCode = new QRCodeStyling({ data: DATA, nodeCanvas, plugins: [ring("#e11d48")] });
    const canvas = nodeCanvas.createCanvas(300, 300);
    const context = canvas.getContext("2d");
    context.drawImage(await nodeCanvas.loadImage(await qrCode.getRawData("png")), 0, 0);
    const [r, g, b] = context.getImageData(150, 2, 1, 1).data;
    expect([r, g, b]).toEqual([225, 29, 72]);
    expect(await qrCode.verify({ decoder: jsQR })).toMatchObject({ readable: true });
  });

  it("afterDraw() adds elements to the SVG, also without a DOM", async () => {
    const svg = (
      await new QRCodeStyling({ data: DATA, type: "svg", plugins: [ring("#e11d48")] }).getRawData("svg")
    ).toString();
    expect(svg).toMatch(/<circle cx="150" cy="150" r="148" fill="none" stroke="#e11d48"\/><\/svg>$/);
  });

  it("gets the code's area, inside a frame too", async () => {
    const areas = [];
    const spy = { afterDraw: ({ area }) => areas.push(area) };
    await new QRCodeStyling({ data: DATA, type: "svg", plugins: [spy] }).getRawData("svg");
    await new QRCodeStyling({
      data: DATA,
      type: "svg",
      plugins: [spy],
      frameOptions: { color: "#000", width: 20 },
      labelOptions: { text: "QUÉT MÃ" }
    }).getRawData("svg");
    expect(areas[0].size).toBe(areas[0].count * areas[0].dotSize);
    expect(areas[0].x + areas[0].size / 2).toBeCloseTo(150, 0);
    expect(areas[1].x).toBeGreaterThanOrEqual(20);
    expect(areas[1].size).toBeLessThan(300);
    expect(areas).toHaveLength(2);
  });

  it("runs plugins in order and waits for async ones", async () => {
    const calls = [];
    const slow = { afterDraw: () => new Promise((resolve) => setTimeout(() => resolve(calls.push("slow")), 10)) };
    const fast = { afterDraw: () => calls.push("fast") };
    await new QRCodeStyling({ data: DATA, type: "svg", plugins: [slow, fast] }).getRawData("svg");
    expect(calls).toEqual(["slow", "fast"]);
  });
});
