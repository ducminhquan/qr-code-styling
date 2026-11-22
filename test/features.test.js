// @vitest-environment node
import nodeCanvas from "canvas";
import jsQR from "jsqr";
import { Resvg } from "@resvg/resvg-js";
import QRCodeStyling, { payload } from "../src/index";
import { diffImages } from "./helpers/image";

const LONG = "https://nhathuoclongchau.com.vn/san-pham/thuoc-abc-123?utm_source=qr";

describe("Unicode data", () => {
  it.each(["Nhà thuốc Long Châu – đơn thuốc #12345", "Nguyễn Văn Quân 💊", "東京 ✓"])("reads back %s", async (data) => {
    const result = await new QRCodeStyling({ data, nodeCanvas }).verify({ decoder: jsQR });
    expect(result).toMatchObject({ readable: true, decoded: data });
  });

  it("does not change how other instances encode Latin-1 text", async () => {
    new QRCodeStyling({ data: "Nhà thuốc" });
    const a = new QRCodeStyling({ data: "café", type: "svg" });
    const b = new QRCodeStyling({ data: "café", type: "svg" });
    expect((await a.getRawData("svg")).toString()).toBe((await b.getRawData("svg")).toString());
  });
});

describe('shape: "circle"', () => {
  const variants = {
    square: {},
    rounded: { dotsOptions: { type: "rounded", color: "#1d4ed8" }, backgroundOptions: { color: "#fef3c7" } },
    fluid: {
      dotsOptions: {
        type: "fluid",
        gradient: {
          type: "linear",
          rotation: 0.8,
          colorStops: [
            { offset: 0, color: "#1d4ed8" },
            { offset: 1, color: "#db2777" }
          ]
        }
      }
    },
    "with logo plate": { dotsOptions: { type: "classy-rounded" }, qrOptions: { errorCorrectionLevel: "H" } }
  };

  describe.each(Object.entries(variants))("%s", (_name, options) => {
    it.each(["L", "M", "Q", "H"])("scans at error correction %s", async (level) => {
      const qrCode = new QRCodeStyling({
        data: LONG,
        width: 360,
        height: 360,
        shape: "circle",
        nodeCanvas,
        ...options,
        qrOptions: { errorCorrectionLevel: level }
      });
      expect(await qrCode.verify({ decoder: jsQR })).toMatchObject({ readable: true, decoded: LONG });
    });

    it("draws the same picture as SVG and as canvas", async () => {
      const qrCode = new QRCodeStyling({
        data: LONG,
        width: 360,
        height: 360,
        shape: "circle",
        nodeCanvas,
        ...options
      });
      const svg = (await qrCode.getRawData("svg")).toString();
      const fromSvg = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg)).render().asPng();
      const diff = await diffImages(Buffer.from(fromSvg), await qrCode.getRawData("png"), 48);
      expect(diff.ratio).toBeLessThan(0.02);
    });
  });

  it("leaves the corners of the image empty and fills the circle", async () => {
    const png = await new QRCodeStyling({
      data: LONG,
      width: 300,
      height: 300,
      shape: "circle",
      nodeCanvas,
      backgroundOptions: { color: "#ff0000" }
    }).getRawData("png");
    const canvas = nodeCanvas.createCanvas(300, 300);
    const context = canvas.getContext("2d");
    context.drawImage(await nodeCanvas.loadImage(png), 0, 0);
    expect(context.getImageData(2, 2, 1, 1).data[3]).toBe(0);
    const dark = (x, y) => context.getImageData(x, y, 1, 1).data[1] < 100;
    // Decorative dots appear outside the square code but inside the circle.
    let decorated = 0;
    for (let x = 140; x < 160; x++) for (let y = 4; y < 30; y++) if (dark(x, y)) decorated++;
    expect(decorated).toBeGreaterThan(0);
  });

  it("is the same every time for the same data", async () => {
    const render = () => new QRCodeStyling({ data: LONG, type: "svg", shape: "circle" }).getRawData("svg");
    expect((await render()).toString()).toBe((await render()).toString());
  });
});

describe("payload builders", () => {
  it("builds Wi-Fi data with escaping", () => {
    expect(payload.wifi({ ssid: "Long Châu;Free", password: 'p"a:ss' })).toBe(
      'WIFI:T:WPA;S:Long Châu\\;Free;P:p\\"a\\:ss;;'
    );
    expect(payload.wifi({ ssid: "Guest", hidden: true })).toBe("WIFI:T:nopass;S:Guest;H:true;;");
    expect(QRCodeStyling.payload.wifi({ ssid: "x", password: "y", encryption: "WEP" })).toBe("WIFI:T:WEP;S:x;P:y;;");
  });

  it("builds a vCard", () => {
    const card = payload.vCard({
      firstName: "Quân",
      lastName: "Nguyễn",
      organization: "FPT Retail, Long Châu",
      phone: ["+84 900 000 000"],
      email: "a@example.com",
      address: { city: "Hồ Chí Minh", country: "Việt Nam" }
    });
    expect(card.split("\r\n")).toEqual([
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Nguyễn;Quân;;;",
      "FN:Quân Nguyễn",
      "ORG:FPT Retail\\, Long Châu",
      "TEL;TYPE=CELL:+84 900 000 000",
      "EMAIL:a@example.com",
      "ADR;TYPE=WORK:;;;Hồ Chí Minh;;;Việt Nam",
      "END:VCARD"
    ]);
  });

  it("builds a calendar event in UTC, or with dates only", () => {
    const timed = payload.event({
      title: "Khai trương",
      start: new Date(Date.UTC(2026, 11, 1, 2, 30)),
      end: "2026-12-01T04:00:00Z",
      location: "Q.1"
    });
    expect(timed).toContain("DTSTART:20261201T023000Z\r\nDTEND:20261201T040000Z");
    expect(payload.event({ title: "Sale", start: new Date(2026, 11, 12), allDay: true })).toContain(
      "DTSTART;VALUE=DATE:20261212"
    );
    expect(() => payload.event({ title: "x", start: "not a date" })).toThrow(/Invalid date/);
  });

  it("builds e-mail, phone, SMS and location data", () => {
    expect(payload.email({ to: "cskh@example.com", subject: "Đơn hàng", body: "Xin chào" })).toBe(
      "mailto:cskh@example.com?subject=%C4%90%C6%A1n%20h%C3%A0ng&body=Xin%20ch%C3%A0o"
    );
    expect(payload.phone("1800 6928")).toBe("tel:18006928");
    expect(payload.sms({ number: "+84 900", message: "hi" })).toBe("SMSTO:+84900:hi");
    expect(payload.geo({ latitude: 10.77, longitude: 106.7 })).toBe("geo:10.77,106.7");
  });

  it("produces codes that scan back to the same text", async () => {
    const data = payload.vCard({ name: "Nhà thuốc Long Châu", phone: "18006928" });
    const result = await new QRCodeStyling({ data, nodeCanvas, width: 400, height: 400 }).verify({ decoder: jsQR });
    expect(result).toMatchObject({ readable: true, decoded: data });
  });
});

describe("share()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the Web Share API with a file when it can", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, canShare: () => true });
    const qrCode = new QRCodeStyling({ data: "share me", type: "svg" });
    expect(await qrCode.share({ name: "code", extension: "svg", title: "QR" })).toBe("shared");
    const [{ files, title }] = share.mock.calls[0];
    expect(title).toBe("QR");
    expect(files[0].name).toBe("code.svg");
    expect(files[0].type).toBe("image/svg+xml");
  });

  it("reports a cancelled share sheet", async () => {
    const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(abort), canShare: () => true });
    expect(await new QRCodeStyling({ data: "x", type: "svg" }).share({ extension: "svg" })).toBe("cancelled");
  });

  it("falls back to download when sharing files is not supported", async () => {
    vi.stubGlobal("navigator", { canShare: () => false, share: vi.fn() });
    const qrCode = new QRCodeStyling({ data: "x", type: "svg" });
    const download = vi.spyOn(qrCode, "download").mockResolvedValue(undefined);
    expect(await qrCode.share({ extension: "svg" })).toBe("downloaded");
    expect(download).toHaveBeenCalledWith({ name: "qr", extension: "svg" });
  });
});

describe("payload escaping", () => {
  it("escapes backslashes in Wi-Fi and vCard values", () => {
    expect(payload.wifi({ ssid: "a\\b", password: "c" })).toBe("WIFI:T:WPA;S:a\\\\b;P:c;;");
    expect(payload.vCard({ name: "x;y\\z\nw" })).toContain("FN:x\\;y\\\\z\\nw");
  });
});
