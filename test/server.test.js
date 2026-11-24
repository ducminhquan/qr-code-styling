// @vitest-environment node
/**
 * Server-side rendering without jsdom or node-canvas.
 * The SVG produced by the built-in virtual DOM must be byte-identical to the jsdom path
 * (which compat.test.js already pins to qr-code-styling-node@1.5.0).
 */
import nodeCanvas from "canvas";
import { JSDOM } from "jsdom";
import { Resvg } from "@resvg/resvg-js";
import QRCodeStyling from "../src/index";
import { cases, LOGO, SVG_LOGO } from "./helpers/cases";
import { diffImages } from "./helpers/image";

const svgOf = async (options) => (await new QRCodeStyling(options).getRawData("svg")).toString();

describe("SVG without jsdom", () => {
  it("runs in a plain Node environment", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  describe.each(Object.entries(cases))("%s", (_name, options) => {
    it("matches the jsdom output byte for byte", async () => {
      const withJsdom = await svgOf({ ...options, type: "svg", jsdom: JSDOM, nodeCanvas });
      const withoutDom = await svgOf({ ...options, type: "svg" });

      expect(withoutDom).toEqual(withJsdom);
    });
  });

  it("returns a Buffer, like the jsdom path", async () => {
    const data = await new QRCodeStyling({ data: "buffer", type: "svg" }).getRawData("svg");
    expect(Buffer.isBuffer(data)).toBe(true);
  });

  it("works with the default type (canvas) as long as svg is requested", async () => {
    const qrCode = new QRCodeStyling({ data: "default type" });
    const svg = (await qrCode.getRawData("svg")).toString();

    expect(svg).toEqual(await svgOf({ data: "default type", type: "svg", jsdom: JSDOM, nodeCanvas }));
  });

  it("explains what to install when png is requested without canvas or resvg", async () => {
    const qrCode = new QRCodeStyling({ data: "png" });
    await expect(qrCode.getRawData("png")).rejects.toThrow(/node-canvas.*resvg/);
  });

  it("update() keeps working", async () => {
    const qrCode = new QRCodeStyling({ data: "first", type: "svg" });
    qrCode.update({ data: "second", dotsOptions: { type: "dots" } });

    expect((await qrCode.getRawData("svg")).toString()).toEqual(
      await svgOf({ data: "second", dotsOptions: { type: "dots" }, type: "svg", jsdom: JSDOM, nodeCanvas })
    );
  });

  describe("logo handling", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("saveAsBlob keeps a data URL logo as is", async () => {
      const svg = await svgOf({ data: "blob", type: "svg", image: SVG_LOGO, imageOptions: { saveAsBlob: true } });
      expect(svg).toContain(`href="${SVG_LOGO}"`);
    });

    it("loads a remote logo with fetch and embeds it with saveAsBlob", async () => {
      const png = Buffer.from(LOGO.split(",")[1], "base64");
      const fetchMock = vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } }));
      vi.stubGlobal("fetch", fetchMock);

      const linked = await svgOf({ data: "remote", type: "svg", image: "https://example.com/logo.png" });
      const embedded = await svgOf({
        data: "remote",
        type: "svg",
        image: "https://example.com/logo.png",
        imageOptions: { saveAsBlob: true }
      });

      expect(fetchMock).toHaveBeenCalledWith("https://example.com/logo.png");
      expect(linked).toContain('href="https://example.com/logo.png"');
      expect(embedded).toContain(`href="data:image/png;base64,${png.toString("base64")}"`);
      // Same layout either way: only the href differs.
      expect(embedded.replace(/href="[^"]*"/, "")).toEqual(linked.replace(/href="[^"]*"/, ""));
    });

    it("reports a failed logo download", async () => {
      vi.stubGlobal("fetch", async () => new Response("nope", { status: 404 }));
      await expect(svgOf({ data: "x", type: "svg", image: "https://example.com/missing.png" })).rejects.toThrow(
        /HTTP 404/
      );
    });
  });
});

describe("PNG with resvg instead of node-canvas", () => {
  it.each(["defaults", "dots: rounded", "linear gradient dots + radial background", "logo, hidden dots", "svg logo"])(
    "%s looks the same as the node-canvas output",
    async (name) => {
      const options = cases[name];
      const viaResvg = await new QRCodeStyling({ ...options, resvg: Resvg }).getRawData("png");
      const viaCanvas = await new QRCodeStyling({ ...options, nodeCanvas }).getRawData("png");

      expect(Buffer.isBuffer(viaResvg)).toBe(true);
      const diff = await diffImages(viaResvg, viaCanvas, 48);
      expect(diff.sizeMismatch).toBe(false);
      // Edges are anti-aliased differently by the two engines; the picture itself must match.
      expect(diff.ratio).toBeLessThan(0.03);
    }
  );

  it("embeds a remote logo before rasterizing", async () => {
    const png = Buffer.from(LOGO.split(",")[1], "base64");
    vi.stubGlobal("fetch", async () => new Response(png, { headers: { "content-type": "image/png" } }));
    try {
      const remote = await new QRCodeStyling({
        data: "r",
        image: "https://example.com/l.png",
        resvg: Resvg
      }).getRawData("png");
      const inline = await new QRCodeStyling({ data: "r", image: LOGO, resvg: Resvg }).getRawData("png");
      expect((await diffImages(remote, inline, 0)).ratio).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("refuses formats resvg cannot write", async () => {
    await expect(new QRCodeStyling({ data: "j", resvg: Resvg }).getRawData("jpeg")).rejects.toThrow(/only produce png/);
  });
});

describe("idPrefix without a DOM", () => {
  it("prefixes ids and references in the SVG string", async () => {
    const svg = (
      await new QRCodeStyling({ data: "prefix", type: "svg", idPrefix: "menu-" }).getRawData("svg")
    ).toString();
    expect(svg).toContain('id="menu-clip-path-dot-color"');
    expect(svg).toContain("url('#menu-clip-path-dot-color')");
    expect(svg).not.toContain('id="clip-path-dot-color"');
  });
});
