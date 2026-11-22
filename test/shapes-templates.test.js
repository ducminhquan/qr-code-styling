// @vitest-environment node
/**
 * Shaped codes (heart, hexagon, octagon, diamond), labels on top and bottom with several lines, and the
 * VietQR card template. Every design must still scan.
 */
import nodeCanvas from "canvas";
import jsQR from "jsqr";
import { Resvg } from "@resvg/resvg-js";
import QRCodeStyling, { templates, formatVND, vietQRBankNames, payload } from "../src/index";
import { getShapeLayout } from "../src/tools/codeShape";

const readSVG = async (options) => {
  const svg = (await new QRCodeStyling({ ...options, type: "svg" }).getRawData("svg")).toString();
  // Labels are drawn without fonts: text is outside the code, and glyphs from whatever fonts the machine has
  // can look like finder patterns to jsQR, which (unlike phone scanners) searches the whole image.
  const image = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg), {
    background: "white",
    font: { loadSystemFonts: false }
  }).render();
  return { svg, text: jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data };
};

const readCanvas = async (options) => {
  const png = await new QRCodeStyling({ ...options, nodeCanvas }).getRawData("png");
  const image = await nodeCanvas.loadImage(png);
  const canvas = nodeCanvas.createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  return jsQR(context.getImageData(0, 0, image.width, image.height).data, image.width, image.height)?.data;
};

const SHAPES = ["heart", "hexagon", "octagon", "diamond"];
const DATA = ["https://nhathuoclongchau.com.vn", "x".repeat(120)];

describe("shaped codes", () => {
  describe.each(SHAPES)("%s", (shape) => {
    it.each(["square", "rounded", "classy-rounded", "fluid"])("scans with %s dots (SVG and canvas)", async (type) => {
      for (const data of DATA) {
        const options = {
          data,
          shape,
          width: 600,
          height: 600,
          margin: 10,
          dotsOptions: { type, color: "#c81e4a" },
          backgroundOptions: { color: "#fff0f3" }
        };
        expect((await readSVG(options)).text).toBe(data);
        expect(await readCanvas(options)).toBe(data);
      }
    });

    it("keeps the code and its quiet ring clear of decoration", () => {
      const count = 29;
      const layout = getShapeLayout({ shape }, count);
      expect(layout.size).toBeGreaterThan(count);
      for (let i = -1; i <= count; i++) {
        for (let j = -1; j <= count; j++) expect(layout.isDecoration(i, j)).toBe(false);
      }
      let decorations = 0;
      for (let i = -layout.pad; i < count + layout.pad; i++) {
        for (let j = -layout.pad; j < count + layout.pad; j++) if (layout.isDecoration(i, j)) decorations++;
      }
      expect(decorations).toBeGreaterThan(50);
    });

    it("clips the background to the outline", async () => {
      const { svg } = await readSVG({ data: "bg", shape, backgroundOptions: { color: "#fff0f3" } });
      expect(svg).toMatch(/<clipPath id="clip-path-background-color"><path d="M /);
    });
  });

  it("draws the same picture every time", async () => {
    const a = (await readSVG({ data: "same", shape: "heart" })).svg;
    const b = (await readSVG({ data: "same", shape: "heart" })).svg;
    expect(a).toBe(b);
  });

  it("square and unknown shapes have no layout", () => {
    expect(getShapeLayout({ shape: "square" }, 21)).toBeUndefined();
    expect(getShapeLayout({ shape: "star" }, 21)).toBeUndefined();
    expect(getShapeLayout({}, 21)).toBeUndefined();
  });

  it("check() measures modules on the shaped grid", () => {
    const plain = QRCodeStyling.check({ data: "x", width: 300, height: 300 });
    const heart = QRCodeStyling.check({ data: "x", shape: "heart", width: 300, height: 300 });
    expect(heart.moduleSize).toBeLessThan(plain.moduleSize);
  });
});

describe("labels on top and bottom", () => {
  it("draws both, with several lines", async () => {
    const { svg, text } = await readSVG({
      data: "labels",
      width: 400,
      height: 560,
      frameOptions: { color: "#0b4ea2" },
      labelOptions: [
        { position: "top", text: "Scan me" },
        {
          position: "bottom",
          background: "none",
          lines: [{ text: "150.000 đ", fontSize: 30, color: "#0b4ea2" }, { text: "Line two <&>" }]
        }
      ]
    });
    expect(text).toBe("labels");
    expect(svg).toContain(">Scan me</text>");
    expect(svg).toContain(">150.000 đ</text>");
    expect(svg).toContain("Line two &lt;&amp;&gt;</text>");
    // Only the top band is filled.
    expect((svg.match(/<rect [^>]*fill="#0b4ea2"/g) || []).length).toBe(1);
  });

  it("splits text at line breaks", async () => {
    const { svg } = await readSVG({ data: "x", width: 300, height: 400, labelOptions: { text: "one\ntwo" } });
    expect(svg).toContain(">one</text>");
    expect(svg).toContain(">two</text>");
  });

  it("draws labels on canvas too", async () => {
    const options = {
      data: "canvas labels",
      width: 400,
      height: 520,
      frameOptions: {},
      labelOptions: [
        { position: "top", text: "Top" },
        { position: "bottom", lines: [{ text: "A" }, { text: "B" }] }
      ]
    };
    expect(await readCanvas(options)).toBe("canvas labels");
  });
});

describe("templates.vietQR", () => {
  const card = {
    bank: "VCB",
    account: "0011001234567",
    amount: 150000,
    accountName: "Nhà thuốc Long Châu",
    message: "Don LC1"
  };

  it("returns options with the VietQR data and a card that scans", async () => {
    const options = templates.vietQR(card);
    expect(options.data).toBe(payload.vietQR(card));
    expect(QRCodeStyling.templates.vietQR).toBe(templates.vietQR);
    const { svg, text } = await readSVG(options);
    expect(text).toBe(options.data);
    expect(svg).toContain(">Quét mã để thanh toán</text>");
    expect(svg).toContain(">150.000 đ</text>");
    expect(svg).toContain(">NHÀ THUỐC LONG CHÂU</text>");
    expect(svg).toContain(">Vietcombank · 0011001234567</text>");
    expect(svg).toContain(">Don LC1</text>");
    expect(QRCodeStyling.check(options).ok).toBe(true);
  });

  it("keeps the code as wide as the card", () => {
    const options = templates.vietQR(card);
    expect(options.width).toBe(600);
    expect(options.height).toBeGreaterThan(700);
  });

  it.each(["blue", "red", "green", "purple", "orange", "black"])("the %s theme scans", async (theme) => {
    const options = templates.vietQR({ ...card, theme });
    expect((await readSVG(options)).text).toBe(options.data);
    expect(QRCodeStyling.check(options).issues.filter((issue) => issue.level !== "info")).toEqual([]);
  });

  it("takes a logo, a color, a title and a plain layout", async () => {
    const logo =
      "data:image/svg+xml;base64," +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#e11"/></svg>'
      ).toString("base64");
    const withLogo = templates.vietQR({ ...card, logo, color: "#0b5394", title: "" });
    expect(withLogo.image).toBe(logo);
    expect(withLogo.qrOptions.errorCorrectionLevel).toBe("H");
    expect(withLogo.dotsOptions.color).toBe("#0b5394");
    expect(withLogo.labelOptions).toHaveLength(1);
    expect((await readSVG(withLogo)).text).toBe(withLogo.data);

    const plain = templates.vietQR({ ...card, layout: "plain" });
    expect(plain.labelOptions).toBeUndefined();
    expect(plain.frameOptions).toBeUndefined();
  });

  it("can be combined with any other option, such as a heart shape", async () => {
    const options = { ...templates.vietQR({ bank: "MB", account: "0123456789", theme: "red" }), shape: "heart" };
    expect((await readSVG(options)).text).toBe(options.data);
  });

  it("formats amounts and names banks", () => {
    expect(formatVND(150000)).toBe("150.000 đ");
    expect(formatVND("2.500.000")).toBe("2.500.000 đ");
    expect(formatVND(999)).toBe("999 đ");
    expect(vietQRBankNames["970418"]).toBe("BIDV");
    const unknown = templates.vietQR({ bank: "970999", account: "1" });
    expect(unknown.labelOptions[1].lines.at(-1).text).toBe("970999 · 1");
  });
});
