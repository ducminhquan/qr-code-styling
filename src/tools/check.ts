import { RequiredOptions } from "../core/QROptions";
import { Gradient, QRCode } from "../types";
import errorCorrectionPercents from "../constants/errorCorrectionPercents";
import getFrameLayout, { hasFrame } from "./frameLayout";
import { getShapeLayout } from "./codeShape";

export type CheckLevel = "error" | "warning" | "info";

export interface CheckIssue {
  level: CheckLevel;
  /** Stable id, e.g. "low-contrast", for code that wants to filter issues. */
  code: string;
  message: string;
}

export interface CheckOptions {
  /** Printed width of the whole image in millimetres. Turns on the module size check for print. */
  printWidthMm?: number;
  /** Expected scanning distance in millimetres (default 200 when printWidthMm is set). */
  scanDistanceMm?: number;
}

export interface CheckResult {
  /** false when at least one issue has level "error". */
  ok: boolean;
  issues: CheckIssue[];
  /** QR version (1-40) and modules per side. */
  version: number;
  modules: number;
  /** Size of one module in pixels, and in millimetres when printWidthMm is given. */
  moduleSize: number;
  moduleSizeMm?: number;
  /** Lowest contrast ratio found between code colors and background (1-21), when colors could be read. */
  contrast?: number;
}

type RGBA = [number, number, number, number];

const NAMED: Record<string, RGBA> = {
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  transparent: [0, 0, 0, 0],
  red: [255, 0, 0, 1],
  green: [0, 128, 0, 1],
  blue: [0, 0, 255, 1],
  yellow: [255, 255, 0, 1],
  gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1]
};

/** Reads #rgb, #rgba, #rrggbb, #rrggbbaa, rgb() and rgba() and a few names. Undefined if unknown. */
export function parseCSSColor(color?: string): RGBA | undefined {
  if (!color) return undefined;
  const text = color.trim().toLowerCase();
  if (NAMED[text]) return NAMED[text];
  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.replace(/./g, "$&$&");
    if (h.length !== 6 && h.length !== 8) return undefined;
    const value = (i: number): number => parseInt(h.slice(i, i + 2), 16);
    return [value(0), value(2), value(4), h.length === 8 ? value(6) / 255 : 1];
  }
  const rgb = /^rgba?\(([^)]+)\)$/.exec(text);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return undefined;
    const channel = (part: string): number => (part.endsWith("%") ? (parseFloat(part) * 255) / 100 : parseFloat(part));
    const alpha =
      parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    const result: RGBA = [channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha];
    return result.some((v) => isNaN(v)) ? undefined : result;
  }
  return undefined;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
const luminance = ([r, g, b]: RGBA): number => {
  const linear = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/** WCAG contrast ratio, 1 to 21. */
export const contrastRatio = (a: RGBA, b: RGBA): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** Blends a translucent color onto an opaque one. */
const over = (top: RGBA, bottom: RGBA): RGBA => {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
};

const colorsOf = (color?: string, gradient?: Gradient): (string | undefined)[] =>
  gradient?.colorStops?.length ? gradient.colorStops.map((stop) => stop.color) : [color];

const DOT_TYPES_WITH_SMALL_MARKS = ["dots", "small-square", "diamond", "vertical-lines", "horizontal-lines", "circuit"];

/**
 * Checks for the usual reasons a styled QR code does not scan, without rendering or decoding it:
 * contrast, inverted colors, logo size against error correction, quiet zone, module size and density.
 * For QR art or unusual colors, `verify()` with a decoder gives the final answer.
 */
export default function checkQR(options: RequiredOptions, qr: QRCode, checkOptions: CheckOptions = {}): CheckResult {
  const issues: CheckIssue[] = [];
  const add = (level: CheckLevel, code: string, message: string): void => {
    issues.push({ level, code, message });
  };

  const modules = qr.getModuleCount();
  const version = (modules - 17) / 4;

  // Where the code is drawn and how big one module is.
  let regionSize: number;
  let quietPx: number;
  if (hasFrame(options)) {
    const layout = getFrameLayout(options);
    regionSize = layout.qr.size;
    quietPx = layout.qr.x - (layout.frame?.thickness ?? 0);
    // Label text must stay readable on what is behind it: the label's band, or the panel.
    const hard = new Set<string>();
    layout.labels.forEach(({ fill, lines }) => {
      const behind = parseCSSColor(fill ?? (options.backgroundOptions.gradient ? undefined : layout.background));
      if (!behind || behind[3] < 1) return;
      lines.forEach(({ text, color }) => {
        const ink = parseCSSColor(color);
        if (ink && text && contrastRatio(over(ink, behind), behind) < 3) hard.add(text);
      });
    });
    if (hard.size) {
      const names = Array.from(hard)
        .map((text) => `"${text}"`)
        .join(", ");
      add(
        "warning",
        "label-contrast",
        `Label text ${names} is hard to read on its background; use a contrast of 3:1 or more.`
      );
    }
  } else {
    regionSize = Math.min(options.width, options.height) - options.margin * 2;
    quietPx = options.margin;
  }
  const gridSize = getShapeLayout(options, modules)?.size ?? modules;
  const moduleSize = Math.floor(regionSize / gridSize);
  quietPx += (regionSize - modules * moduleSize) / 2;

  // Contrast between every code color and the background.
  const backgroundColors = colorsOf(options.backgroundOptions.color, options.backgroundOptions.gradient);
  const parsedBackgrounds = backgroundColors.map(parseCSSColor);
  const transparentBackground = parsedBackgrounds.some((c) => c && c[3] < 1);
  const white: RGBA = [255, 255, 255, 1];
  const backgrounds = parsedBackgrounds.filter((c): c is RGBA => !!c).map((c) => over(c, white));
  const foregroundColors = [
    ...colorsOf(options.dotsOptions.color, options.dotsOptions.gradient),
    ...colorsOf(options.cornersSquareOptions?.color, options.cornersSquareOptions?.gradient),
    ...colorsOf(options.cornersDotOptions?.color, options.cornersDotOptions?.gradient)
  ].filter((c): c is string => !!c);
  const foregrounds = foregroundColors.map(parseCSSColor).filter((c): c is RGBA => !!c);
  const unreadable = [...backgroundColors.filter(Boolean), ...foregroundColors].filter((c) => !parseCSSColor(c));

  let contrast: number | undefined;
  let inverted = false;
  if (!options.art && foregrounds.length && backgrounds.length) {
    contrast = 21;
    for (const fg of foregrounds) {
      for (const bg of backgrounds) {
        const fgOnBg = over(fg, bg);
        contrast = Math.min(contrast, contrastRatio(fgOnBg, bg));
        if (luminance(fgOnBg) > luminance(bg)) inverted = true;
      }
    }
    contrast = Math.round(contrast * 100) / 100;
    if (contrast < 2.5) {
      add(
        "error",
        "low-contrast",
        `Code colors and background are too close (contrast ${contrast}:1); use at least 4:1.`
      );
    } else if (contrast < 4) {
      add("warning", "low-contrast", `Contrast is ${contrast}:1. Older phones and dim shops need about 4:1 or more.`);
    }
    if (inverted) {
      add("warning", "inverted", "Dots are lighter than the background. Many scanners only read dark-on-light codes.");
    }
  }
  if (unreadable.length) {
    add("info", "unknown-color", `Could not read color ${unreadable.join(", ")}; contrast not checked for it.`);
  }
  if (transparentBackground) {
    add(
      "info",
      "transparent-background",
      "The background is transparent: the code only scans on a light surface. Check it where it will be placed."
    );
  }

  // Logo size against error correction. The logo may hide imageSize x (what level ECL recovers) of the modules.
  const ecl = options.qrOptions.errorCorrectionLevel;
  if (options.image) {
    const share = options.imageOptions.imageSize;
    const capacity = errorCorrectionPercents[ecl];
    const percent = (value: number): string => `${Math.round(value * 100)}%`;
    if (share > 0.8) {
      add(
        "error",
        "logo-too-large",
        `imageOptions.imageSize ${share} lets the logo use ${percent(share)} of what level ${ecl} can repair, ` +
          `leaving almost nothing for glare, creases or print defects. Use 0.5 or less.`
      );
    } else if (share > 0.5) {
      add(
        "warning",
        "logo-large",
        `The logo uses ${percent(share)} of what level ${ecl} can repair; keep imageOptions.imageSize at 0.5 or less for printed codes.`
      );
    }
    if (ecl === "L" || ecl === "M") {
      add(
        "warning",
        "low-error-correction",
        `With a logo, level ${ecl} (${percent(capacity)}) leaves the logo small and the code fragile; use "Q" or "H".`
      );
    }
  }

  // Quiet zone around the code.
  if (!options.art?.placement && moduleSize > 0) {
    const quietModules = quietPx / moduleSize;
    if (quietModules < 2) {
      add(
        "info",
        "quiet-zone",
        `Only ${Math.round(quietModules * 10) / 10} modules of empty space around the code; 4 is the standard. ` +
          `Fine if it sits on a plain light area; otherwise raise margin.`
      );
    }
  }

  // Module size, on screen and in print.
  if (moduleSize < 1) {
    add(
      "error",
      "too-small",
      `The code has ${modules} modules per side but only ${regionSize}px: increase width/height.`
    );
  } else if (moduleSize < 3) {
    add("warning", "small-modules", `Each module is ${moduleSize}px; draw at least 3px per module, or more for print.`);
  }

  let moduleSizeMm: number | undefined;
  if (checkOptions.printWidthMm && checkOptions.printWidthMm > 0 && moduleSize > 0) {
    moduleSizeMm = Math.round(((checkOptions.printWidthMm * moduleSize) / options.width) * 1000) / 1000;
    const distance = checkOptions.scanDistanceMm ?? 200;
    // Rule of thumb: the code should be at least a tenth of the scanning distance.
    const codeMm = moduleSizeMm * modules;
    if (moduleSizeMm < 0.25) {
      add(
        "error",
        "print-too-small",
        `Modules print at ${moduleSizeMm} mm; most printers and phones need 0.33 mm or more.`
      );
    } else if (moduleSizeMm < 0.4) {
      add(
        "warning",
        "print-small",
        `Modules print at ${moduleSizeMm} mm; 0.4 mm or more scans reliably on thermal labels.`
      );
    }
    if (codeMm < distance / 10) {
      add(
        "warning",
        "scan-distance",
        `The code prints ${Math.round(codeMm)} mm wide; from ${distance} mm away it should be at least ${Math.round(distance / 10)} mm.`
      );
    }
  }

  // Density.
  if (version > 15) {
    add(
      "warning",
      "dense",
      `Version ${version} (${modules}x${modules} modules) is dense. Shorten the data, e.g. with a short URL, or lower error correction.`
    );
  }

  if (DOT_TYPES_WITH_SMALL_MARKS.includes(options.dotsOptions.type) && moduleSize < 6) {
    add(
      "info",
      "thin-dots",
      `"${options.dotsOptions.type}" dots fill less of each module; give them 6px or more per module.`
    );
  }
  if (options.art) {
    add("info", "art", "QR art changes what scanners see: confirm with verify({ decoder }).");
  }

  return {
    ok: !issues.some((issue) => issue.level === "error"),
    issues,
    version,
    modules,
    moduleSize,
    moduleSizeMm,
    contrast
  };
}
