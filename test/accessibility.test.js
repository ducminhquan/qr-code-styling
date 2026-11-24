// Runs in jsdom (browser path); the Node path is checked with getSVGString() on the virtual DOM below.
import QRCodeStyling from "../src/index";

const base = { data: "https://nhathuoclongchau.com.vn", width: 200, height: 200 };
const title = 'Pay 150.000 d to "Long Chau" <shop> & co';

describe("title", () => {
  it("svg: role, aria-label and a first-child <title>", async () => {
    const qrCode = new QRCodeStyling({ ...base, type: "svg", title });
    await qrCode._svgDrawingPromise;
    const svg = qrCode._svg.getElement();
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.getAttribute("aria-label")).toBe(title);
    expect(svg.firstChild.nodeName).toBe("title");
    expect(svg.firstChild.textContent).toBe(title);
    expect(svg.querySelectorAll("title")).toHaveLength(1);
  });

  it("svg with a frame and a label has one title, on the outer svg", async () => {
    const qrCode = new QRCodeStyling({
      ...base,
      type: "svg",
      title,
      frameOptions: { color: "#333" },
      labelOptions: { text: "Scan" }
    });
    await qrCode._svgDrawingPromise;
    const svg = qrCode._svg.getElement();
    expect(svg.querySelectorAll("title")).toHaveLength(1);
    expect(svg.firstChild.nodeName).toBe("title");
    expect(svg.querySelectorAll("[role]")).toHaveLength(0);
  });

  it("canvas: role and aria-label", async () => {
    document.body.innerHTML = "<div id='qr'></div>";
    const qrCode = new QRCodeStyling({ ...base, title });
    qrCode.append(document.getElementById("qr"));
    const canvas = document.querySelector("#qr canvas");
    expect(canvas.getAttribute("role")).toBe("img");
    expect(canvas.getAttribute("aria-label")).toBe(title);
  });

  it("is escaped in the SVG string", async () => {
    const svg = await new QRCodeStyling({ ...base, type: "svg", title }).getSVGString();
    expect(svg).toContain("&lt;shop&gt; &amp; co</title>");
  });

  it("without a title nothing changes", async () => {
    const svg = await new QRCodeStyling({ ...base, type: "svg" }).getSVGString();
    expect(svg).not.toContain("<title");
    expect(svg).not.toContain("role=");
  });
});
