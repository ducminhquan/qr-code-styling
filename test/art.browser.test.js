// Runs in the jsdom environment: QR art through the browser code path (DOM canvas and Image).
import fs from "fs";
import path from "path";
import jsQR from "jsqr";
import QRCodeStyling from "../src/index";

const PICTURE = `data:image/jpeg;base64,${fs.readFileSync(path.resolve(__dirname, "fixtures/landscape.jpg")).toString("base64")}`;

describe("QR art in the browser", () => {
  it.each(["halftone", "colorize"])("%s renders into a container and scans", async (mode) => {
    document.body.innerHTML = "<div id='qr'></div>";
    const qrCode = new QRCodeStyling({ data: "browser art", art: { image: PICTURE, mode } });
    qrCode.append(document.getElementById("qr"));
    await qrCode._canvasDrawingPromise;

    expect(document.querySelector("#qr canvas")).not.toBeNull();
    expect(await qrCode.verify({ decoder: jsQR })).toMatchObject({ readable: true, decoded: "browser art" });
  });

  it("works for svg type", async () => {
    const qrCode = new QRCodeStyling({ data: "browser art", type: "svg", art: { image: PICTURE } });
    await qrCode._svgDrawingPromise;
    expect(qrCode._svg.getElement().querySelectorAll("rect").length).toBeGreaterThan(100);
  });
});
