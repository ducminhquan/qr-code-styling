// @vitest-environment node
/**
 * VietQR and GS1 Digital Link payloads, check(), printable sheets and PDFs, CSV input and the CLI.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import jsQR from "jsqr";
import { Resvg } from "@resvg/resvg-js";
import nodeCanvas from "canvas";
import QRCodeStyling, { payload } from "../src/index";
import { crc16, toPlainASCII } from "../src/payloads/vietqr";
import { normalizeGTIN } from "../src/payloads/gs1";
import { sheet, pdf, parseCSV, fillTemplate, embedSVG, pageSize } from "../src/print/index";

/** Reads EMVCo id/length/value fields into an object (nested templates stay strings). */
const readEMV = (text) => {
  const fields = {};
  for (let i = 0; i < text.length;) {
    const id = text.slice(i, i + 2);
    const length = Number(text.slice(i + 2, i + 4));
    fields[id] = text.slice(i + 4, i + 4 + length);
    i += 4 + length;
  }
  return fields;
};

const decodeSVG = (svg) => {
  const image = new Resvg(QRCodeStyling._normalizeSVGForResvg(svg), { background: "white" }).render();
  return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data;
};

describe("payload.vietQR", () => {
  it("uses the CRC-16/CCITT-FALSE checksum", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("builds a static code for an account", () => {
    const data = payload.vietQR({ bank: "VCB", account: "0011001234567" });
    const fields = readEMV(data);
    expect(fields["00"]).toBe("01");
    expect(fields["01"]).toBe("11");
    expect(fields["53"]).toBe("704");
    expect(fields["58"]).toBe("VN");
    expect(fields["54"]).toBeUndefined();
    const merchant = readEMV(fields["38"]);
    expect(merchant["00"]).toBe("A000000727");
    expect(merchant["02"]).toBe("QRIBFTTA");
    expect(readEMV(merchant["01"])).toEqual({ "00": "970436", "01": "0011001234567" });
    expect(data.slice(-8, -4)).toBe("6304");
    expect(data.slice(-4)).toBe(crc16(data.slice(0, -4)));
  });

  it("builds a dynamic code with amount and a plain-ASCII message", () => {
    const data = payload.vietQR({
      bank: "970422",
      account: "0123 456 789",
      amount: "150.000",
      message: "Thanh toán đơn hàng LC123",
      type: "card"
    });
    const fields = readEMV(data);
    expect(fields["01"]).toBe("12");
    expect(fields["54"]).toBe("150000");
    expect(readEMV(fields["62"])["08"]).toBe("Thanh toan don hang LC123");
    expect(readEMV(readEMV(fields["38"])["01"])["01"]).toBe("0123456789");
    expect(readEMV(fields["38"])["02"]).toBe("QRIBFTTC");
  });

  it("accepts bank short names in any case", () => {
    expect(payload.vietQR({ bank: "tcb", account: "1" })).toContain("0006970407");
    expect(payload.vietQRBanks.BIDV).toBe("970418");
  });

  it("rejects unknown banks, bad accounts and bad amounts", () => {
    expect(() => payload.vietQR({ bank: "XYZ", account: "1" })).toThrow(/Unknown bank/);
    expect(() => payload.vietQR({ bank: "VCB", account: "12-34" })).toThrow(/account/);
    expect(() => payload.vietQR({ bank: "VCB", account: "1", amount: -5 })).toThrow(/amount/);
    expect(() => payload.vietQR({ bank: "VCB", account: "1", amount: "1.5e3x" })).toThrow(/amount/);
  });

  it("removes Vietnamese accents", () => {
    expect(toPlainASCII("Đặng Thị Ánh  Nguyệt")).toBe("Dang Thi Anh Nguyet");
  });

  it("scans back from a styled code", async () => {
    const data = payload.vietQR({ bank: "MB", account: "0123456789", amount: 50000, message: "Don LC1" });
    const svg = (
      await new QRCodeStyling({ data, type: "svg", dotsOptions: { type: "rounded" } }).getRawData("svg")
    ).toString();
    expect(decodeSVG(svg)).toBe(data);
  });
});

describe("payload.gs1", () => {
  it("builds a Digital Link with lot in the path and expiry in the query", () => {
    expect(payload.gs1({ gtin: "8935049500131", lot: "A1/B", serial: "S 9", expiry: "2027-06-30" })).toBe(
      "https://id.gs1.org/01/08935049500131/10/A1%2FB/21/S%209?17=270630"
    );
  });

  it("uses your own domain, Date objects and extra AIs", () => {
    expect(
      payload.gs1({
        gtin: "08935049500131",
        domain: "https://qr.example.vn/",
        expiry: new Date(2026, 11, 31),
        bestBefore: "261130",
        extra: { 3103: "000500" }
      })
    ).toBe("https://qr.example.vn/01/08935049500131?17=261231&15=261130&3103=000500");
  });

  it("checks the GTIN", () => {
    expect(normalizeGTIN("96385074")).toBe("00000096385074");
    expect(() => payload.gs1({ gtin: "8935049500132" })).toThrow(/check digit/);
    expect(() => payload.gs1({ gtin: "123" })).toThrow(/digits/);
    expect(() => payload.gs1({ gtin: "8935049500131", expiry: "30/06/2027" })).toThrow(/date/);
  });
});

describe("check()", () => {
  const codes = (result) => result.issues.map((issue) => issue.code);

  it("passes a plain black code", () => {
    const result = QRCodeStyling.check({ data: "https://example.com", margin: 40 });
    expect(result).toMatchObject({ ok: true, version: 2, modules: 25, contrast: 21 });
    expect(result.issues).toEqual([]);
  });

  it("is an instance method too, and does not need a canvas", () => {
    const qrCode = new QRCodeStyling({ data: "instance", type: "svg" });
    expect(qrCode.check().ok).toBe(true);
  });

  it("flags low contrast and inverted colors", () => {
    expect(codes(QRCodeStyling.check({ data: "x", dotsOptions: { color: "#ddd" } }))).toContain("low-contrast");
    expect(QRCodeStyling.check({ data: "x", dotsOptions: { color: "#ddd" } }).ok).toBe(false);
    const inverted = QRCodeStyling.check({
      data: "x",
      dotsOptions: { color: "#fff" },
      backgroundOptions: { color: "#000" }
    });
    expect(codes(inverted)).toContain("inverted");
  });

  it("checks every gradient stop and corner color", () => {
    const result = QRCodeStyling.check({
      data: "x",
      dotsOptions: {
        gradient: {
          type: "linear",
          colorStops: [
            { offset: 0, color: "#000" },
            { offset: 1, color: "#eee" }
          ]
        }
      }
    });
    expect(result.ok).toBe(false);
    expect(codes(QRCodeStyling.check({ data: "x", cornersSquareOptions: { color: "rgb(240, 240, 240)" } }))).toContain(
      "low-contrast"
    );
  });

  it("flags large logos and low error correction", () => {
    const tooLarge = QRCodeStyling.check({ data: "x", image: "logo.png", imageOptions: { imageSize: 0.9 } });
    expect(codes(tooLarge)).toContain("logo-too-large");
    const lowLevel = QRCodeStyling.check({ data: "x", image: "logo.png", qrOptions: { errorCorrectionLevel: "L" } });
    expect(codes(lowLevel)).toContain("low-error-correction");
  });

  it("checks module size on screen and in print", () => {
    const small = QRCodeStyling.check({ data: "y".repeat(300), width: 120, height: 120 });
    expect(codes(small)).toContain("small-modules");
    const print = QRCodeStyling.check({ data: "y".repeat(300) }, { printWidthMm: 12 });
    expect(print.moduleSizeMm).toBeLessThan(0.25);
    expect(codes(print)).toEqual(expect.arrayContaining(["print-too-small", "scan-distance"]));
    expect(codes(QRCodeStyling.check({ data: "z".repeat(900) }))).toContain("dense");
  });

  it("notes transparent backgrounds and unknown colors instead of guessing", () => {
    const result = QRCodeStyling.check({
      data: "x",
      backgroundOptions: { color: "transparent" },
      dotsOptions: { color: "var(--brand)" }
    });
    expect(result.ok).toBe(true);
    expect(codes(result)).toEqual(expect.arrayContaining(["transparent-background", "unknown-color"]));
  });
});

describe("parseCSV", () => {
  it("reads Excel exports: BOM, semicolons, quotes and line breaks", () => {
    const rows = parseCSV('\uFEFFsku;name;note\r\nA1;"Vitamin ""C""";"two\nlines"\r\n\r\nB2;Thuốc;\r\n');
    expect(rows).toEqual([
      { sku: "A1", name: 'Vitamin "C"', note: "two\nlines" },
      { sku: "B2", name: "Thuốc", note: "" }
    ]);
  });

  it("reads commas and tabs", () => {
    expect(parseCSV("a,b\n1,2")).toEqual([{ a: "1", b: "2" }]);
    expect(parseCSV("a\tb\n1\t2")).toEqual([{ a: "1", b: "2" }]);
  });

  it("fills templates from columns", () => {
    expect(fillTemplate("https://shop.vn/p/{ sku }?n={name}&x={missing}", { sku: "A1", name: "B" })).toBe(
      "https://shop.vn/p/A1?n=B&x="
    );
  });
});

describe("sheet()", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({
    data: `https://example.com/p/${i}`,
    caption: `Item ${i} <&>`
  }));

  it("splits codes into A4 pages", async () => {
    const pages = await sheet(items, { sizeMm: 35 });
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('width="210mm" height="297mm"');
    expect((pages[0].match(/<svg[^>]* x="/g) || []).length).toBe(24);
    expect((pages[1].match(/<svg[^>]* x="/g) || []).length).toBe(6);
    expect(pages[0]).toContain("Item 0 &lt;&amp;&gt;");
  });

  it("gives every code its own gradient and clip-path ids", async () => {
    const [page] = await sheet(items.slice(0, 3), {
      template: {
        dotsOptions: {
          gradient: {
            type: "linear",
            colorStops: [
              { offset: 0, color: "#f00" },
              { offset: 1, color: "#00f" }
            ]
          }
        }
      }
    });
    const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(3);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [, id] of page.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(id);
  });

  it("supports page sizes, landscape and cut lines", async () => {
    expect(pageSize({ page: "A6", orientation: "landscape" })).toEqual({ widthMm: 148, heightMm: 105 });
    const [page] = await sheet(items.slice(0, 2), {
      page: { widthMm: 50, heightMm: 30 },
      sizeMm: 20,
      marginMm: 2,
      gapMm: 2,
      cutLines: true
    });
    expect(page).toContain('viewBox="0 0 50 30"');
    expect(page).toContain('stroke="#bbb"');
    await expect(sheet(items, { sizeMm: 300 })).rejects.toThrow(/does not fit/);
  });

  it("each code on the sheet scans", async () => {
    const [page] = await sheet([{ data: "https://example.com/scan-me" }], {
      page: { widthMm: 40, heightMm: 40 },
      sizeMm: 30,
      marginMm: 5
    });
    expect(decodeSVG(page.replace('width="40mm" height="40mm"', 'width="400" height="400"'))).toBe(
      "https://example.com/scan-me"
    );
  });

  it("embedSVG keeps foreign url() references alone", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect id="a" fill="url(#a)" style="x:url(#b)"/></svg>';
    expect(embedSVG(svg, "p-", 0, 0, 5)).toContain('id="p-a" fill="url(#p-a)" style="x:url(#b)"');
  });
});

describe("pdf()", () => {
  const items = [{ data: "https://example.com/pdf", caption: "Panadol 45.000đ" }];

  /** Checks the xref table points at each "n 0 obj". */
  const checkXref = (bytes) => {
    const text = Buffer.from(bytes).toString("latin1");
    const start = Number(/startxref\n(\d+)/.exec(text)[1]);
    const entries = text
      .slice(start)
      .split("\n")
      .slice(3)
      .filter((line) => / n $/.test(line));
    entries.forEach((line, index) => {
      expect(text.slice(Number(line.slice(0, 10)), Number(line.slice(0, 10)) + 10)).toMatch(
        new RegExp(`^${index + 1} 0 obj`)
      );
    });
    return text;
  };

  it("writes a valid PDF with resvg", async () => {
    const bytes = await pdf(items, { resvg: Resvg, dpi: 72, title: "Nhãn kệ" });
    const text = checkXref(bytes);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 595.276 841.89]");
    expect((text.match(/\/Type \/Page /g) || []).length).toBe(1);
    expect(text).toContain("/Title (Nhn k)");
  });

  it("works with node-canvas and splits pages", async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ data: `p${i}` }));
    // A6 with 40 mm codes holds 2 x 2.
    const bytes = await pdf(many, { nodeCanvas, dpi: 50, page: "A6", sizeMm: 40 });
    const text = checkXref(bytes);
    expect((text.match(/\/Type \/Page /g) || []).length).toBe(2);
  });

  it("says what is missing on a server", async () => {
    await expect(pdf(items)).rejects.toThrow(/resvg/);
  });
});

const root = path.resolve(__dirname, "..");
const cli = path.join(root, "lib", "cli.cjs");

describe.skipIf(!fs.existsSync(cli))("command line", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-cli-"));
  const run = (...args) =>
    execFileSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", stdio: "pipe" });

  it("prints a payload", () => {
    expect(run("--payload", "vietqr", "--set", "bank=VCB", "--set", "account=0011001234567").trim()).toBe(
      payload.vietQR({ bank: "VCB", account: "0011001234567" })
    );
  });

  it("writes one code", () => {
    run("--data", "https://example.com", "-o", path.join(dir, "one.svg"));
    expect(decodeSVG(fs.readFileSync(path.join(dir, "one.svg"), "utf8"))).toBe("https://example.com");
  });

  it("writes a folder of codes and a PDF sheet from a CSV", () => {
    const csv = path.join(dir, "products.csv");
    fs.writeFileSync(csv, "sku;name;gtin;lot\nLC1;Panadol;8935049500131;A1\nLC1;Vitamin C;8935049500131;B2\n");
    const style = path.join(dir, "style.json");
    fs.writeFileSync(style, JSON.stringify({ dotsOptions: { type: "rounded", color: "#1250dc" }, margin: 20 }));
    run(
      "--csv",
      csv,
      "--data-template",
      "https://shop.vn/p/{sku}",
      "--name",
      "{sku}",
      "-c",
      style,
      "-o",
      path.join(dir, "out")
    );
    expect(fs.readdirSync(path.join(dir, "out")).sort()).toEqual(["LC1-2.svg", "LC1.svg"]);
    expect(decodeSVG(fs.readFileSync(path.join(dir, "out", "LC1.svg"), "utf8"))).toBe("https://shop.vn/p/LC1");

    run(
      "--csv",
      csv,
      "--payload",
      "gs1",
      "--caption",
      "{name}",
      "--sheet",
      "--dpi",
      "72",
      "-o",
      path.join(dir, "labels.pdf")
    );
    expect(fs.readFileSync(path.join(dir, "labels.pdf")).subarray(0, 8).toString()).toBe("%PDF-1.4");
  });

  it("exits 1 when --check finds an error", () => {
    let status = 0;
    try {
      run("--data", "x", "--check", "-c", path.join(dir, "bad.json"));
    } catch (error) {
      status = error.status;
    }
    expect(status).toBe(2); // missing config file
    fs.writeFileSync(path.join(dir, "bad.json"), JSON.stringify({ dotsOptions: { color: "#eee" } }));
    try {
      run("--data", "x", "--check", "-c", path.join(dir, "bad.json"));
    } catch (error) {
      status = error.status;
      expect(error.stderr).toMatch(/error: Code colors/);
    }
    expect(status).toBe(1);
  });
});
