/**
 * Print many QR codes at once: lay them out on pages (shelf labels, price tags, product stickers) as
 * SVG, or as a PDF ready to print. Import from "qr-code-styling-node/print".
 */
import QRCodeStyling from "../core/QRCodeStyling";
import { Canvas, Options, ResvgConstructor } from "../types";
import { writePDF, PDFPageImage } from "./pdf";
import { parseCSV, fillTemplate } from "./csv";

export { parseCSV, fillTemplate };

/** One code on the sheet: its options (data at least) and an optional caption printed under it. */
export type SheetItem = Partial<Options> & { caption?: string };

export type PageSize = "A4" | "A5" | "A6" | "letter" | { widthMm: number; heightMm: number };

export interface SheetOptions {
  /** Options shared by every code (colors, dots, logo...). Each item's own options win. */
  template?: Partial<Options>;
  /** Default "A4". */
  page?: PageSize;
  /** "portrait" (default) or "landscape". */
  orientation?: "portrait" | "landscape";
  /** Width of each code in mm. Default 30. */
  sizeMm?: number;
  /** Space between codes in mm. Default 5. */
  gapMm?: number;
  /** Empty border of the page in mm. Default 10. */
  marginMm?: number;
  /** Caption font size in mm. Default 3 (about 8.5 pt). */
  captionSizeMm?: number;
  captionColor?: string;
  fontFamily?: string;
  /** Thin grey lines around each cell, to cut labels apart. Default false. */
  cutLines?: boolean;
}

export interface PDFOptions extends SheetOptions {
  /** Print resolution. Default 300. */
  dpi?: number;
  /** `Resvg` from "@resvg/resvg-js" to rasterize pages on a server (recommended). */
  resvg?: ResvgConstructor;
  /** Or node-canvas: `require("canvas")`. In a browser neither is needed. */
  nodeCanvas?: Canvas;
  /** PDF title. */
  title?: string;
}

const PAGE_SIZES: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  letter: [215.9, 279.4]
};

const escapeXML = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function pageSize(options: Pick<SheetOptions, "page" | "orientation"> = {}): {
  widthMm: number;
  heightMm: number;
} {
  const page = options.page ?? "A4";
  const [width, height] =
    typeof page === "string"
      ? (PAGE_SIZES[page] ??
        (() => {
          throw new Error(`Unknown page size "${page}": use A4, A5, A6, letter or { widthMm, heightMm }`);
        })())
      : [page.widthMm, page.heightMm];
  return options.orientation === "landscape"
    ? { widthMm: Math.max(width, height), heightMm: Math.min(width, height) }
    : { widthMm: width, heightMm: height };
}

/**
 * Makes one code's SVG safe to place next to others: ids get a prefix so gradients and clip paths of
 * different codes do not mix, and the root <svg> is positioned on the page.
 */
export function embedSVG(svg: string, prefix: string, x: number, y: number, size: number): string {
  const body = svg.replace(/^<\?xml[^>]*\?>\s*/, "");
  const ids = new Set<string>();
  body.replace(/\sid="([^"]+)"/g, (match, id: string) => {
    ids.add(id);
    return match;
  });
  const prefixed = body
    .replace(/\sid="([^"]+)"/g, (_m, id: string) => ` id="${prefix}${id}"`)
    .replace(/url\(\s*'?#([^')]+)'?\s*\)/g, (match, id: string) => (ids.has(id) ? `url(#${prefix}${id})` : match))
    .replace(/(\s(?:xlink:)?href)="#([^"]+)"/g, (match, attr: string, id: string) =>
      ids.has(id) ? `${attr}="#${prefix}${id}"` : match
    );

  return prefixed.replace(/<svg\b([^>]*)>/, (_match, attributes: string) => {
    const width = /\swidth="([\d.]+)/.exec(attributes)?.[1] ?? "300";
    const height = /\sheight="([\d.]+)/.exec(attributes)?.[1] ?? width;
    const viewBox = /\sviewBox="([^"]+)"/.exec(attributes)?.[1] ?? `0 0 ${width} ${height}`;
    const namespaces = (attributes.match(/\sxmlns(?::\w+)?="[^"]*"/g) || []).join("");
    const sizeHeight = (size * Number(height)) / Number(width);
    return (
      `<svg${namespaces} x="${round(x)}" y="${round(y)}" width="${round(size)}" height="${round(sizeHeight)}" ` +
      `viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">`
    );
  });
}

/** Lays the codes out in a grid. Returns one SVG document per page, sized in millimetres. */
export async function sheet(items: SheetItem[], options: SheetOptions = {}): Promise<string[]> {
  const { widthMm, heightMm } = pageSize(options);
  const size = options.sizeMm ?? 30;
  const gap = options.gapMm ?? 5;
  const margin = options.marginMm ?? 10;
  const captionSize = options.captionSizeMm ?? 3;
  const hasCaptions = items.some((item) => item.caption);
  const captionBand = hasCaptions ? captionSize * 1.8 : 0;
  const cellWidth = size;
  const cellHeight = size + captionBand;
  const columns = Math.floor((widthMm - 2 * margin + gap) / (cellWidth + gap));
  const rows = Math.floor((heightMm - 2 * margin + gap) / (cellHeight + gap));
  if (columns < 1 || rows < 1) {
    throw new Error(`A ${size} mm code does not fit on the page with a ${margin} mm margin`);
  }
  const perPage = columns * rows;
  const offsetX = (widthMm - (columns * cellWidth + (columns - 1) * gap)) / 2;
  const offsetY = margin;
  const font = escapeXML(options.fontFamily ?? "Helvetica, Arial, sans-serif");
  const captionColor = escapeXML(options.captionColor ?? "#000");

  const pages: string[] = [];
  for (let start = 0; start < items.length; start += perPage) {
    const parts: string[] = [];
    for (let index = start; index < Math.min(items.length, start + perPage); index++) {
      const { caption, ...own } = items[index];
      const position = index - start;
      const x = offsetX + (position % columns) * (cellWidth + gap);
      const y = offsetY + Math.floor(position / columns) * (cellHeight + gap);
      const merged: Partial<Options> = {
        width: 600,
        height: 600,
        ...options.template,
        ...own,
        type: "svg",
        plugins: own.plugins ?? options.template?.plugins,
        // One path per code: smaller sheets and no hairline seams between modules.
        svgOptions: { mergePaths: true, ...options.template?.svgOptions, ...own.svgOptions }
      };
      const nested = (key: keyof Options): void => {
        const base = options.template?.[key];
        const mine = own[key];
        if (base && typeof base === "object" && mine && typeof mine === "object" && !Array.isArray(base)) {
          (merged as Record<string, unknown>)[key] = { ...base, ...mine };
        }
      };
      (
        [
          "qrOptions",
          "imageOptions",
          "dotsOptions",
          "cornersSquareOptions",
          "cornersDotOptions",
          "backgroundOptions"
        ] as const
      ).forEach(nested);
      if (!merged.data) throw new Error(`Item ${index + 1} has no data`);
      const svg = (await new QRCodeStyling(merged).getRawData("svg")) as Blob | Buffer;
      const text = typeof (svg as Blob).text === "function" ? await (svg as Blob).text() : svg.toString();
      parts.push(embedSVG(text, `q${index}-`, x, y, size));
      if (caption) {
        // Shrink long captions to the cell width (estimating ~0.55 em per character), then squeeze.
        const fit = cellWidth / (0.55 * Array.from(caption).length);
        const fontSize = Math.max(captionSize * 0.6, Math.min(captionSize, fit));
        const squeeze = fit < fontSize ? ` textLength="${round(cellWidth)}" lengthAdjust="spacingAndGlyphs"` : "";
        parts.push(
          `<text x="${round(x + size / 2)}" y="${round(y + size + captionSize * 1.25)}" font-size="${round(fontSize)}" ` +
            `font-family="${font}" fill="${captionColor}" text-anchor="middle"${squeeze}>${escapeXML(caption)}</text>`
        );
      }
      if (options.cutLines) {
        const half = gap / 2;
        parts.push(
          `<rect x="${round(x - half)}" y="${round(y - half)}" width="${round(cellWidth + gap)}" ` +
            `height="${round(cellHeight + gap)}" fill="none" stroke="#bbb" stroke-width="0.1"/>`
        );
      }
    }
    pages.push(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">` +
        `<rect width="${widthMm}" height="${heightMm}" fill="#fff"/>${parts.join("")}</svg>`
    );
  }
  return pages;
}

async function rasterize(
  svg: string,
  width: number,
  height: number,
  options: PDFOptions
): Promise<{ pixels: Uint8Array | Uint8ClampedArray; width: number; height: number }> {
  if (options.resvg) {
    const rendered = new options.resvg(svg, { fitTo: { mode: "width", value: width }, background: "white" }).render();
    return { pixels: rendered.pixels, width: rendered.width, height: rendered.height };
  }
  if (options.nodeCanvas?.createCanvas && options.nodeCanvas.loadImage) {
    const canvas = options.nodeCanvas.createCanvas(width, height);
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    const image = await options.nodeCanvas.loadImage(
      `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
    );
    image.width = width;
    image.height = height;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return { pixels: context.getImageData(0, 0, width, height).data, width, height };
  }
  if (typeof document !== "undefined" && typeof Image !== "undefined") {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = (): void => resolve();
        image.onerror = (): void => reject(new Error("Could not draw the sheet"));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      return { pixels: context.getImageData(0, 0, width, height).data, width, height };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  throw new Error(
    'pdf() on a server needs resvg (pass { resvg: require("@resvg/resvg-js").Resvg }) or node-canvas ({ nodeCanvas: require("canvas") })'
  );
}

/** Lays the codes out like sheet() and returns a print-ready PDF (one image per page, at `dpi`). */
export async function pdf(items: SheetItem[], options: PDFOptions = {}): Promise<Uint8Array> {
  const { widthMm, heightMm } = pageSize(options);
  const dpi = options.dpi ?? 300;
  const width = Math.round((widthMm / 25.4) * dpi);
  const height = Math.round((heightMm / 25.4) * dpi);
  const svgs = await sheet(items, options);
  const pages: PDFPageImage[] = [];
  for (const svg of svgs) {
    // Give resvg/canvas a pixel size and drop the quotes inside url() that some renderers reject.
    const pixelSvg = QRCodeStyling._normalizeSVGForResvg(svg).replace(
      /^(<\?xml[^>]*\?>\s*<svg[^>]*?)width="[^"]+" height="[^"]+"/,
      `$1width="${width}" height="${height}"`
    );
    const image = await rasterize(pixelSvg, width, height, options);
    pages.push({ ...image, widthPt: (widthMm / 25.4) * 72, heightPt: (heightMm / 25.4) * 72 });
  }
  return writePDF(pages, options.title);
}
