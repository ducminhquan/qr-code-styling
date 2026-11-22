/**
 * QR art: blends a picture into the QR code while keeping it scannable.
 *
 * Both renderers (canvas and SVG) share this module. It reads the picture through a canvas
 * (the browser's, or node-canvas on Node) and returns plain shapes and images to draw.
 */
import { RequiredOptions } from "../core/QROptions";
import { ArtOptions, Canvas, FilterFunction, QRCode } from "../types";
import { hasBrowserDom } from "../tools/svgDom";
import getModuleRoles from "./functionModules";

type RGB = [number, number, number];

export interface ArtRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface QRArea {
  count: number;
  dotSize: number;
  x: number;
  y: number;
}

export interface HalftoneArt {
  mode: "halftone";
  rects: ArtRect[];
}

export interface ColorizeArt {
  mode: "colorize";
  /** Full-size canvas holding a darkened copy of the picture inside the QR area, used to paint the dots. */
  dots: Canvas;
  /** Full-size canvas holding a light copy of the picture, drawn behind the dots (when art.background). */
  background?: Canvas;
}

export type PreparedArt = HalftoneArt | ColorizeArt;

/** Default contrast per mode: colorize keeps the dot shapes, so it needs more contrast to scan reliably. */
export const DEFAULT_CONTRAST = { halftone: 0.5, colorize: 0.7 };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const getContrast = (art: ArtOptions): number =>
  clamp01(
    typeof art.contrast === "number" && !isNaN(art.contrast)
      ? art.contrast
      : DEFAULT_CONTRAST[art.mode === "colorize" ? "colorize" : "halftone"]
  );

/** Luminance limits for "dark" and "light" pixels at a given contrast. */
export const getLimits = (contrast: number): { dark: number; light: number } => ({
  dark: 0.45 - 0.35 * contrast,
  light: 0.55 + 0.35 * contrast
});

const luminance = ([r, g, b]: RGB): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export const toDark = (color: RGB, limit: number): RGB => {
  const lum = luminance(color);
  if (lum <= limit) return color;
  const factor = limit / lum;
  return [color[0] * factor, color[1] * factor, color[2] * factor];
};

export const toLight = (color: RGB, limit: number): RGB => {
  const lum = luminance(color);
  if (lum >= limit) return color;
  const t = (limit - lum) / (1 - lum);
  return [color[0] + (255 - color[0]) * t, color[1] + (255 - color[1]) * t, color[2] + (255 - color[2]) * t];
};

const css = ([r, g, b]: RGB): string => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

export function createCanvas(options: RequiredOptions, width: number, height: number): Canvas {
  if (options.nodeCanvas?.createCanvas) {
    return options.nodeCanvas.createCanvas(width, height);
  }
  if (hasBrowserDom()) {
    const canvas = document.createElement("canvas") as Canvas;
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error('QR art reads the picture through a canvas. On a server, pass { nodeCanvas: require("canvas") }.');
}

function loadPicture(options: RequiredOptions, art: ArtOptions): Promise<HTMLImageElement> {
  if (options.nodeCanvas?.loadImage) {
    return options.nodeCanvas.loadImage(art.image);
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const crossOrigin = art.crossOrigin ?? options.imageOptions.crossOrigin;
    if (typeof crossOrigin === "string") image.crossOrigin = crossOrigin;
    image.onload = (): void => resolve(image);
    image.onerror = (): void => reject(new Error(`QR art: failed to load image ${art.image}`));
    image.src = art.image;
  });
}

/** Draws the picture into `width` x `height`, cropped to cover (like CSS object-fit: cover). */
function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number): void {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(
    image,
    (image.width - sourceWidth) / 2,
    (image.height - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
}

function readPixels(options: RequiredOptions, image: HTMLImageElement, width: number, height: number) {
  const canvas = createCanvas(options, width, height);
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.imageSmoothingEnabled = true;
  drawCover(context, image, width, height);
  return { canvas, context, data: context.getImageData(0, 0, width, height).data };
}

/** Converts any CSS color to RGB using a canvas. Falls back to black/white. */
function parseColor(options: RequiredOptions, color: string | undefined, fallback: RGB): RGB {
  if (!color) return fallback;
  const canvas = createCanvas(options, 1, 1);
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const pixel = context.getImageData(0, 0, 1, 1).data;
  return pixel[3] === 0 ? fallback : [pixel[0], pixel[1], pixel[2]];
}

function planHalftone(
  options: RequiredOptions,
  art: ArtOptions,
  image: HTMLImageElement,
  qr: QRCode,
  area: QRArea,
  filter: FilterFunction
): HalftoneArt {
  const { count, dotSize } = area;
  const sub = 3;
  const cells = count * sub;
  const pixels = readPixels(options, image, cells, cells).data;
  const role = getModuleRoles(count);
  const contrast = getContrast(art);
  const limits = getLimits(contrast);
  const strong = getLimits(Math.max(contrast, 0.8));
  const darkColor = parseColor(
    options,
    options.dotsOptions.gradient?.colorStops[0]?.color ?? options.dotsOptions.color,
    [0, 0, 0]
  );
  const lightColor = parseColor(
    options,
    options.backgroundOptions.gradient?.colorStops[0]?.color ?? options.backgroundOptions.color,
    [255, 255, 255]
  );
  const pixelAt = (cx: number, cy: number): RGB => {
    const index = (cy * cells + cx) * 4;
    return [pixels[index], pixels[index + 1], pixels[index + 2]];
  };
  const shade = (color: RGB, dark: boolean, limit: { dark: number; light: number }): string => {
    if (!art.colored) return css(dark ? darkColor : lightColor);
    return css(dark ? toDark(color, limit.dark) : toLight(color, limit.light));
  };

  // Colors of the sub-cell grid (null = leave the background visible).
  const grid: (string | null)[] = new Array(cells * cells).fill(null);
  const centers: ArtRect[] = [];
  const bounds = [0, 1, 2, 3].map((k) => Math.round((k * dotSize) / sub));
  const centerSize = Math.max(1, Math.round(dotSize * (1 / 3 + contrast / 3)));
  const centerOffset = (dotSize - centerSize) / 2;

  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const moduleRole = role(i, j);
      if (moduleRole === "finder" || !filter(i, j)) continue;
      const dark = qr.isDark(i, j);

      for (let a = 0; a < sub; a++) {
        for (let b = 0; b < sub; b++) {
          const cx = i * sub + a;
          const cy = j * sub + b;
          const color = pixelAt(cx, cy);
          const cellDark = moduleRole === "function" ? dark : luminance(color) < 0.5;
          grid[cy * cells + cx] = shade(color, cellDark, moduleRole === "function" ? strong : limits);
        }
      }

      if (moduleRole === "data") {
        const center = pixelAt(i * sub + 1, j * sub + 1);
        centers.push({
          x: area.x + i * dotSize + centerOffset,
          y: area.y + j * dotSize + centerOffset,
          width: centerSize,
          height: centerSize,
          color: shade(center, dark, strong)
        });
      }
    }
  }

  // Merge horizontal runs of equal color to keep the SVG small.
  const rects: ArtRect[] = [];
  for (let cy = 0; cy < cells; cy++) {
    let cx = 0;
    while (cx < cells) {
      const color = grid[cy * cells + cx];
      let end = cx + 1;
      while (end < cells && grid[cy * cells + end] === color) end++;
      if (color) {
        const moduleX0 = Math.floor(cx / sub);
        const moduleX1 = Math.floor((end - 1) / sub);
        const moduleY = Math.floor(cy / sub);
        const x0 = area.x + moduleX0 * dotSize + bounds[cx % sub];
        const x1 = area.x + moduleX1 * dotSize + bounds[((end - 1) % sub) + 1];
        const y0 = area.y + moduleY * dotSize + bounds[cy % sub];
        const y1 = area.y + moduleY * dotSize + bounds[(cy % sub) + 1];
        rects.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, color });
      }
      cx = end;
    }
  }

  return { mode: "halftone", rects: rects.concat(centers) };
}

function prepareColorize(
  options: RequiredOptions,
  art: ArtOptions,
  image: HTMLImageElement,
  area: QRArea
): ColorizeArt {
  const size = area.count * area.dotSize;
  const { data } = readPixels(options, image, size, size);
  const limits = getLimits(getContrast(art));

  const makeLayer = (transform: (color: RGB) => RGB): Canvas => {
    const layer = createCanvas(options, options.width, options.height);
    const context = layer.getContext("2d") as CanvasRenderingContext2D;
    const imageData = context.createImageData(size, size);
    for (let index = 0; index < data.length; index += 4) {
      const [r, g, b] = transform([data[index], data[index + 1], data[index + 2]]);
      imageData.data[index] = r;
      imageData.data[index + 1] = g;
      imageData.data[index + 2] = b;
      imageData.data[index + 3] = 255;
    }
    context.putImageData(imageData, area.x, area.y);
    return layer;
  };

  return {
    mode: "colorize",
    dots: makeLayer((color) => toDark(color, limits.dark)),
    background: art.background === false ? undefined : makeLayer((color) => toLight(color, limits.light))
  };
}

export function getQRArea(options: RequiredOptions, count: number): QRArea {
  const minSize = Math.min(options.width, options.height) - options.margin * 2;
  const dotSize = Math.floor(minSize / count);
  return {
    count,
    dotSize,
    x: Math.floor((options.width - count * dotSize) / 2),
    y: Math.floor((options.height - count * dotSize) / 2)
  };
}

export async function prepareArt(options: RequiredOptions, qr: QRCode, filter: FilterFunction): Promise<PreparedArt> {
  const art = options.art as ArtOptions;
  if (!art.image) throw new Error("QR art needs art.image");
  createCanvas(options, 1, 1); // fail early with a clear message when no canvas is available
  const image = await loadPicture(options, art);
  const area = getQRArea(options, qr.getModuleCount());

  return art.mode === "colorize"
    ? prepareColorize(options, art, image, area)
    : planHalftone(options, art, image, qr, area, filter);
}
