// @vitest-environment node
// Server rendering of the React and Vue wrappers: the HTML already holds the code.
import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToString as renderReact } from "react-dom/server";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import { QRCode as ReactQRCode } from "../src/react/index";
import { QRCode as VueQRCode } from "../src/vue/index";
import QRCodeStyling from "../src/core/QRCodeStyling";

const LOGO = `data:image/jpeg;base64,${fs.readFileSync(path.resolve(__dirname, "fixtures/landscape.jpg")).toString("base64")}`;
const plain = { data: "https://nhathuoclongchau.com.vn", width: 200, height: 200, dotsOptions: { type: "rounded" } };

describe("React on the server", () => {
  it.each(["canvas", "svg"])("a plain %s code is in the HTML", (type) => {
    const html = renderReact(createElement(ReactQRCode, { options: { ...plain, type }, className: "qr" }));
    expect(html).toMatch(/^<div class="qr"><svg /);
    expect(html).toContain("<rect");
  });

  it("a code that needs waiting uses the svg prop", async () => {
    const options = { ...plain, image: LOGO, labelOptions: { text: "Scan me" } };
    expect(renderReact(createElement(ReactQRCode, { options }))).toBe("<div></div>");
    const svg = await new QRCodeStyling({ ...options, type: "svg" }).getSVGString();
    const html = renderReact(createElement(ReactQRCode, { options, svg }));
    expect(html).toContain("<image");
    expect(html).toContain("Scan me");
  });

  it("keeps idPrefix", () => {
    const html = renderReact(createElement(ReactQRCode, { options: { ...plain, idPrefix: "p-" } }));
    expect(html).toContain('id="p-clip-path-dot-color"');
    expect(html).not.toContain('id="clip-path-dot-color"');
  });
});

describe("Vue on the server", () => {
  it("a plain code is in the HTML", async () => {
    const html = await renderVue(createSSRApp({ render: () => h(VueQRCode, { options: plain }) }));
    expect(html).toMatch(/^<div><svg /);
  });

  it("a code with a logo and a label is drawn on the server too", async () => {
    const options = { ...plain, image: LOGO, imageOptions: { saveAsBlob: true }, labelOptions: { text: "Scan me" } };
    const html = await renderVue(createSSRApp({ render: () => h(VueQRCode, { options }) }));
    expect(html).toContain("<image");
    expect(html).toContain("Scan me");
  });

  it("getSVGString() works on Node", async () => {
    const svg = await new QRCodeStyling({ ...plain, type: "svg" }).getSVGString();
    expect(svg.startsWith("<svg")).toBe(true);
  });
});
