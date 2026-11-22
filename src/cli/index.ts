/**
 * Command line: npx qr-code-styling-node --help
 * One code, a folder of codes from a CSV file, or a printable sheet (PDF/SVG).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import QRCodeStyling from "../core/QRCodeStyling";
import { Options, ResvgConstructor, Canvas } from "../types";
import { parseCSV, fillTemplate, sheet, pdf, SheetItem, PageSize } from "../print/index";

const HELP = `qr-code-styling-node: styled QR codes from the command line

One code:
  qr-code-styling-node --data "https://example.com" -o qr.svg
  qr-code-styling-node --payload vietqr --set bank=VCB --set account=0123456789 --set amount=50000 -o pay.png

Many codes from a CSV file (one row per code):
  qr-code-styling-node --csv products.csv --data-template "https://shop.vn/p/{sku}" -o out/ --format png
  qr-code-styling-node --csv products.csv --payload gs1 -o labels.pdf --sheet --caption "{name} {price}"

Options:
  -d, --data <text>            the text or URL to encode
      --csv <file>             CSV with a header row; column "data" is used unless --data-template or --payload
      --data-template <text>   build data from columns, e.g. "https://shop.vn/p/{sku}"
      --payload <type>         build data with payload.<type> from columns or --set: vietqr, gs1, wifi,
                               vcard, email, phone, sms, geo
      --set <key=value>        a field for --payload (repeatable), e.g. --set bank=VCB
  -c, --config <file.json>     QRCodeStyling options (colors, dotsOptions, image...), as in the README
  -o, --out <path>             file (.svg/.png/.pdf) for one code or a sheet; folder for many codes
  -f, --format <svg|png>       file type for many codes (default svg)
      --name <template>        file name for many codes, e.g. "{sku}" (default column "name" or row number)
      --caption <template>     text under each code on a sheet (default column "caption")
      --size <px>              width and height of each image file (default 600)
      --sheet                  put all codes on printable pages (-o ends in .pdf or .svg)
      --page <A4|A5|A6|letter|WxH>  page size for --sheet, WxH in mm (default A4)
      --landscape              landscape pages
      --code-size <mm>         printed code width (default 30)
      --gap <mm>               space between codes (default 5)
      --page-margin <mm>       page border (default 10)
      --dpi <n>                PDF resolution (default 300)
      --cut-lines              thin lines between labels
      --check                  report scanning problems (contrast, logo, size); exit code 1 on errors
  -h, --help                   this help

png and pdf need @resvg/resvg-js (recommended) or canvas installed next to this package.`;

type Row = Record<string, string>;

const fail = (message: string): never => {
  process.stderr.write(`qr-code-styling-node: ${message}\n`);
  process.exit(2);
};

/** Loads an optional package from the user's project first, then from next to this package. */
function optional<T>(name: string): T | undefined {
  for (const from of [join(process.cwd(), "noop.js"), __filename]) {
    try {
      return createRequire(from)(name) as T;
    } catch {
      // try the next place
    }
  }
  return undefined;
}

function loadRasterizer(): { resvg?: ResvgConstructor; nodeCanvas?: Canvas } {
  const resvg = optional<{ Resvg: ResvgConstructor }>("@resvg/resvg-js")?.Resvg;
  if (resvg) return { resvg };
  const nodeCanvas = optional<Canvas>("canvas");
  if (nodeCanvas) return { nodeCanvas };
  return fail("png and pdf output need @resvg/resvg-js or canvas: npm install @resvg/resvg-js");
}

/** Turns "12" into 12 and "true" into true for payload fields like amount or hidden. */
const coerce = (row: Row): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === "") continue;
    out[key] = value === "true" ? true : value === "false" ? false : value;
  }
  return out;
};

function buildData(row: Row, args: { payload?: string; template?: string }): string {
  if (args.payload) {
    const builders = QRCodeStyling.payload as unknown as Record<string, (o: unknown) => string>;
    const name = Object.keys(builders).find((key) => key.toLowerCase() === args.payload!.toLowerCase());
    if (!name || typeof builders[name] !== "function") return fail(`unknown --payload "${args.payload}"`);
    const fields = coerce(row);
    if (name === "phone") return builders.phone(String(fields.number ?? fields.phone ?? ""));
    if (name === "geo") {
      return builders.geo({ latitude: Number(fields.latitude), longitude: Number(fields.longitude) });
    }
    return builders[name](fields);
  }
  if (args.template) return fillTemplate(args.template, row);
  return row.data ?? fail('the CSV has no "data" column: use --data-template or --payload');
}

const safeFileName = (name: string): string =>
  // eslint-disable-next-line no-control-regex
  name.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim() || "qr";

function parsePage(value?: string): PageSize | undefined {
  if (!value) return undefined;
  const custom = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i.exec(value);
  if (custom) return { widthMm: Number(custom[1]), heightMm: Number(custom[2]) };
  const known = ["A4", "A5", "A6", "letter"].find((page) => page.toLowerCase() === value.toLowerCase());
  return (known as PageSize) ?? fail(`unknown --page "${value}"`);
}

async function main(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      data: { type: "string", short: "d" },
      csv: { type: "string" },
      "data-template": { type: "string" },
      payload: { type: "string" },
      set: { type: "string", multiple: true },
      config: { type: "string", short: "c" },
      out: { type: "string", short: "o" },
      format: { type: "string", short: "f" },
      name: { type: "string" },
      caption: { type: "string" },
      size: { type: "string" },
      sheet: { type: "boolean" },
      page: { type: "string" },
      landscape: { type: "boolean" },
      "code-size": { type: "string" },
      gap: { type: "string" },
      "page-margin": { type: "string" },
      dpi: { type: "string" },
      "cut-lines": { type: "boolean" },
      check: { type: "boolean" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help || argv.length === 0) {
    process.stdout.write(HELP + "\n");
    return 0;
  }

  const config: Partial<Options> = values.config ? JSON.parse(readFileSync(values.config, "utf8")) : {};
  const size = values.size ? Number(values.size) : (config.width ?? 600);
  const template: Partial<Options> = { ...config, width: size, height: config.height ?? size };

  // Rows: from the CSV, or a single one from --data / --set.
  const setRow: Row = {};
  for (const pair of values.set ?? []) {
    const index = pair.indexOf("=");
    if (index < 1) fail(`--set expects key=value, got "${pair}"`);
    setRow[pair.slice(0, index).trim()] = pair.slice(index + 1);
  }
  const rows: Row[] = values.csv
    ? parseCSV(readFileSync(values.csv, "utf8")).map((row) => ({ ...setRow, ...row }))
    : [values.data !== undefined ? { ...setRow, data: values.data } : setRow];
  if (!rows.length) fail("the CSV file has no rows");

  const items = rows.map((row, index) => {
    const data =
      values.data !== undefined && !values.csv
        ? values.data
        : buildData(row, { payload: values.payload, template: values["data-template"] });
    if (!data) fail(`row ${index + 1}: no data`);
    const caption = values.caption ? fillTemplate(values.caption, row) : row.caption;
    const name = values.name ? fillTemplate(values.name, row) : row.name || String(index + 1);
    return { row, data, caption, name };
  });

  let errors = 0;
  if (values.check) {
    items.forEach((item, index) => {
      const printWidthMm = values.sheet ? Number(values["code-size"] ?? 30) : undefined;
      const result = QRCodeStyling.check({ ...template, data: item.data }, { printWidthMm });
      for (const issue of result.issues) {
        if (issue.level === "error") errors++;
        process.stderr.write(`${items.length > 1 ? `row ${index + 1}: ` : ""}${issue.level}: ${issue.message}\n`);
      }
    });
    if (!values.out) return errors ? 1 : 0;
  }

  if (!values.out) {
    if (items.length === 1 && !values.sheet) {
      process.stdout.write(items[0].data + "\n");
      return errors ? 1 : 0;
    }
    fail("use -o to say where to write");
  }
  const out = resolve(values.out!);

  if (values.sheet) {
    const sheetItems: SheetItem[] = items.map((item) => ({ data: item.data, caption: item.caption }));
    const sheetOptions = {
      template,
      page: parsePage(values.page),
      orientation: values.landscape ? ("landscape" as const) : ("portrait" as const),
      sizeMm: values["code-size"] ? Number(values["code-size"]) : undefined,
      gapMm: values.gap ? Number(values.gap) : undefined,
      marginMm: values["page-margin"] ? Number(values["page-margin"]) : undefined,
      cutLines: !!values["cut-lines"]
    };
    mkdirSync(dirname(out), { recursive: true });
    if (extname(out).toLowerCase() === ".svg") {
      const pages = await sheet(sheetItems, sheetOptions);
      pages.forEach((page, index) => {
        const file = pages.length === 1 ? out : out.replace(/\.svg$/i, `-${index + 1}.svg`);
        writeFileSync(file, page);
      });
      process.stderr.write(`${items.length} codes on ${pages.length} page(s): ${out}\n`);
    } else {
      const bytes = await pdf(sheetItems, {
        ...sheetOptions,
        ...loadRasterizer(),
        dpi: values.dpi ? Number(values.dpi) : undefined,
        title: "QR codes"
      });
      writeFileSync(out, bytes);
      process.stderr.write(`${items.length} codes: ${out}\n`);
    }
    return errors ? 1 : 0;
  }

  const single = items.length === 1 && !values.csv;
  const format = (values.format ?? (single ? extname(out).slice(1) : "svg") ?? "svg").toLowerCase();
  if (format !== "svg" && format !== "png") fail(`--format must be svg or png, not "${format}"`);
  const rasterizer = format === "png" ? loadRasterizer() : {};
  if (!single) mkdirSync(out, { recursive: true });
  else mkdirSync(dirname(out), { recursive: true });

  const used = new Set<string>();
  for (const item of items) {
    const qr = new QRCodeStyling({ ...template, ...rasterizer, data: item.data, type: "svg" });
    const bytes = (await qr.getRawData(format as "svg" | "png")) as Buffer;
    let file = out;
    if (!single) {
      let base = safeFileName(item.name);
      for (let n = 2; used.has(base); n++) base = `${safeFileName(item.name)}-${n}`;
      used.add(base);
      file = join(out, `${base}.${format}`);
    }
    writeFileSync(file, bytes);
  }
  process.stderr.write(single ? `${out}\n` : `${items.length} files in ${out}\n`);
  return errors ? 1 : 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => fail(error instanceof Error ? error.message : String(error))
);
