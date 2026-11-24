// @vitest-environment node
import QRCodeStyling from "../src/index";

it("title works without a DOM and is escaped", async () => {
  const svg = (
    await new QRCodeStyling({ data: "x", type: "svg", title: 'A "b" <c> & d' }).getRawData("svg")
  ).toString();
  expect(svg).toMatch(/<svg [^>]*role="img"/);
  expect(svg).toMatch(/aria-label="A &quot;b&quot; &lt;c&gt; &amp; d"/);
  expect(svg).toMatch(/<svg [^>]*><title>A "b" &lt;c&gt; &amp; d<\/title><defs>/);
});
