// Runs in the jsdom environment (browser code path).
import jsQR from "jsqr";
import QRCodeStyling from "../src/index";

const BROKEN_LOGO = "data:image/png;base64,AAAAAAAA";
const text = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
const within = (promise, ms = 5000) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), ms))]);

describe("a logo that fails to load in the browser", () => {
  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it("svg: the code is drawn without the logo instead of hanging", async () => {
    const qrCode = new QRCodeStyling({ data: "logo fails", type: "svg", image: BROKEN_LOGO });
    const svg = await text(await within(qrCode.getRawData("svg")));
    expect(svg).not.toContain("<image");
    expect(svg).toContain("<rect");
    expect(console.warn).toHaveBeenCalled();
  });

  it("canvas: the code is drawn without the logo and scans", async () => {
    document.body.innerHTML = "<div id='qr'></div>";
    const qrCode = new QRCodeStyling({ data: "logo fails", image: BROKEN_LOGO });
    qrCode.append(document.getElementById("qr"));
    await within(qrCode._canvasDrawingPromise);
    expect(await within(qrCode.verify({ decoder: jsQR }))).toMatchObject({ readable: true, decoded: "logo fails" });
  });
});

const gradientOptions = {
  type: "svg",
  dotsOptions: {
    gradient: {
      type: "linear",
      colorStops: [
        { offset: 0, color: "#e00" },
        { offset: 1, color: "#00e" }
      ]
    }
  },
  backgroundOptions: { round: 0.2, color: "#ffe" }
};

const idsOf = (root) => Array.from(root.querySelectorAll("[id]")).map((element) => element.id);
const referencesOf = (root) =>
  Array.from(root.querySelectorAll("*")).flatMap((element) =>
    ["clip-path", "fill"]
      .map((name) => element.getAttribute(name) || "")
      .flatMap((value) => [...value.matchAll(/url\(['"]?#([^'")]+)/g)].map((match) => match[1]))
  );

describe("SVG ids", () => {
  it("two codes on one page get ids of their own", async () => {
    document.body.innerHTML = "<div id='a'></div><div id='b'></div>";
    const first = new QRCodeStyling({ ...gradientOptions, data: "first" });
    const second = new QRCodeStyling({ ...gradientOptions, data: "second" });
    first.append(document.getElementById("a"));
    second.append(document.getElementById("b"));
    await first._svgDrawingPromise;
    await second._svgDrawingPromise;
    await new Promise((resolve) => setTimeout(resolve));

    const all = idsOf(document);
    expect(all.length).toBeGreaterThan(2);
    expect(new Set(all).size).toBe(all.length);
    // The first code keeps the ids it always had.
    expect(idsOf(document.getElementById("a"))).toContain("clip-path-dot-color");
    for (const id of ["a", "b"]) {
      const svg = document.getElementById(id).querySelector("svg");
      const own = new Set(idsOf(svg));
      const references = referencesOf(svg);
      expect(references.length).toBeGreaterThan(0);
      // Every reference stays inside its own code (a reference without a target keeps pointing nowhere).
      references.forEach((reference) => {
        const target = document.getElementById(reference);
        if (target) expect(svg.contains(target)).toBe(true);
      });
      expect(references.filter((reference) => own.has(reference)).length).toBeGreaterThan(0);
    }
  });

  it("idPrefix renames every id and reference", async () => {
    const svg = await text(
      await new QRCodeStyling({ ...gradientOptions, data: "prefix", idPrefix: "menu-" }).getRawData("svg")
    );
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(1);
    ids.forEach((id) => expect(id.startsWith("menu-")).toBe(true));
    // Colors are not references.
    expect(svg).toContain('fill="#ffe"');
    [...svg.matchAll(/url\('?#([^')]+)/g)].forEach((match) => expect(match[1].startsWith("menu-")).toBe(true));
  });

  it("a code without idPrefix keeps its markup", async () => {
    const svg = await text(await new QRCodeStyling({ ...gradientOptions, data: "same" }).getRawData("svg"));
    expect(svg).toContain('id="clip-path-dot-color"');
  });
});
