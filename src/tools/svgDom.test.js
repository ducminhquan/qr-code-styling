// @vitest-environment node
import { JSDOM } from "jsdom";
import { createVirtualWindow } from "./svgDom";

const NS = "http://www.w3.org/2000/svg";
const build = (win) => {
  const svg = win.document.createElementNS(NS, "svg");
  svg.setAttribute("data-text", `a & b < c > d "e" 'f'\n\t\r`);
  const defs = win.document.createElementNS(NS, "defs");
  const clip = win.document.createElementNS(NS, "clipPath");
  clip.setAttribute("id", "c");
  defs.appendChild(clip);
  svg.appendChild(defs);
  const old = win.document.createElementNS(NS, "g");
  svg.appendChild(old);
  const replacement = old.cloneNode(false);
  replacement.setAttribute("x", "1");
  svg.replaceChild(replacement, old);
  return new win.XMLSerializer().serializeToString(svg);
};

describe("virtual SVG DOM", () => {
  it("serializes exactly like jsdom's XMLSerializer", () => {
    expect(build(createVirtualWindow())).toEqual(build(new JSDOM("").window));
  });
});
