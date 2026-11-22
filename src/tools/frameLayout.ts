import { RequiredOptions } from "../core/QROptions";
import { LabelLineOptions, LabelOptions } from "../types";

export interface LabelLine {
  text: string;
  /** Center of the line. */
  x: number;
  y: number;
  color: string;
  font: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
}

export interface LabelLayout {
  position: "top" | "bottom";
  band: { x: number; y: number; width: number; height: number };
  /** Fill of the band, or undefined for none. */
  fill?: string;
  lines: LabelLine[];
}

export interface FrameLayout {
  width: number;
  height: number;
  /** Where the QR code goes, as a square. */
  qr: { x: number; y: number; size: number };
  frame?: { thickness: number; radius: number; color: string };
  /** At most one label on top and one at the bottom. */
  labels: LabelLayout[];
  background: string;
}

/** labelOptions as a list of labels that have text. */
export const getLabels = (options: Pick<RequiredOptions, "labelOptions">): LabelOptions[] => {
  const value = options.labelOptions;
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.filter((label) => !!label && (!!label.text || !!label.lines?.some((line) => line.text)));
};

export const hasFrame = (options: RequiredOptions): boolean => !!(options.frameOptions || getLabels(options).length);

const DEFAULT_FONT = "Helvetica, Arial, sans-serif";

/** Font size of a label's first line, in px. */
const baseFontSize = (label: LabelOptions, unit: number): number =>
  label.fontSize ?? Math.max(8, Math.round(unit * 0.07));

/** The lines of a label: `lines`, or `text` split at line breaks, each with its own size and weight. */
const labelLines = (
  label: LabelOptions,
  unit: number
): { text: string; fontSize: number; fontWeight: string; color?: string; fontFamily: string }[] => {
  const fontSize = baseFontSize(label, unit);
  const fontFamily = label.fontFamily ?? DEFAULT_FONT;
  const fontWeight = String(label.fontWeight ?? "bold");
  const lines: LabelLineOptions[] = label.lines?.length
    ? label.lines
    : (label.text || "").split("\n").map((text) => ({ text }));
  return lines.map((line) => ({
    text: line.text,
    fontSize: line.fontSize ?? fontSize,
    fontWeight: String(line.fontWeight ?? fontWeight),
    color: line.color,
    fontFamily: line.fontFamily ?? fontFamily
  }));
};

/** Height of a label's band in px: 1.8 x the font size for one line, 1.3 per line plus a margin for more. */
export const labelBandHeight = (label: LabelOptions, unit: number): number => {
  const lines = labelLines(label, unit);
  if (lines.length === 1) return Math.round(lines[0].fontSize * 1.8);
  const total = lines.reduce((sum, line) => sum + line.fontSize * 1.3, 0);
  return Math.round(total + baseFontSize(label, unit) * 0.6);
};

export default function getFrameLayout(options: RequiredOptions): FrameLayout {
  const { width, height } = options;
  const unit = Math.min(width, height);
  const frame = options.frameOptions;
  const labels = getLabels(options);
  const top = labels.find((label) => label.position === "top");
  const bottom = labels.find((label) => label.position !== "top");

  const thickness = frame ? Math.max(0, frame.width ?? Math.round(unit * 0.04)) : 0;
  const padding = Math.max(0, frame?.padding ?? (frame ? Math.round(unit * 0.04) : options.margin));
  const topHeight = top ? labelBandHeight(top, unit) : 0;
  const bottomHeight = bottom ? labelBandHeight(bottom, unit) : 0;

  const innerX = thickness;
  const innerY = thickness;
  const innerWidth = width - 2 * thickness;
  const innerHeight = height - 2 * thickness;
  const qrRegionY = innerY + topHeight;
  const qrRegionHeight = innerHeight - topHeight - bottomHeight;
  const size = Math.floor(Math.min(innerWidth, qrRegionHeight) - 2 * padding);

  if (size <= 0) throw new Error("frameOptions/labelOptions leave no room for the QR code; increase width/height");

  const frameColor = frame?.color ?? "#000";

  const layoutLabel = (label: LabelOptions, position: "top" | "bottom", bandHeight: number): LabelLayout => {
    const band = {
      x: innerX,
      y: position === "top" ? innerY : innerY + innerHeight - bandHeight,
      width: innerWidth,
      height: bandHeight
    };
    const noFill = label.background === "none" || label.background === "transparent";
    const fill = noFill ? undefined : (label.background ?? (frame ? frameColor : undefined));
    const defaultColor =
      label.color ?? (fill && frame && !label.background ? "#fff" : options.dotsOptions.color || "#000");
    const lines = labelLines(label, unit);
    let y: number;
    if (lines.length === 1) {
      y = band.y + band.height / 2;
    } else {
      const total = lines.reduce((sum, line) => sum + line.fontSize * 1.3, 0);
      y = band.y + (band.height - total) / 2;
    }
    return {
      position,
      band,
      fill,
      lines: lines.map((line) => {
        let center = y;
        if (lines.length > 1) {
          center = y + (line.fontSize * 1.3) / 2;
          y += line.fontSize * 1.3;
        }
        return {
          text: line.text,
          x: band.x + band.width / 2,
          y: center,
          color: line.color ?? defaultColor,
          font: `${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`,
          fontSize: line.fontSize,
          fontFamily: line.fontFamily,
          fontWeight: line.fontWeight
        };
      })
    };
  };

  return {
    width,
    height,
    qr: {
      x: Math.round(innerX + (innerWidth - size) / 2),
      y: Math.round(qrRegionY + (qrRegionHeight - size) / 2),
      size
    },
    frame: frame ? { thickness, radius: Math.max(0, frame.radius ?? 0), color: frameColor } : undefined,
    labels: [
      ...(top ? [layoutLabel(top, "top", topHeight)] : []),
      ...(bottom ? [layoutLabel(bottom, "bottom", bottomHeight)] : [])
    ],
    background: options.backgroundOptions.color || "#fff"
  };
}

/** Options for drawing the bare QR code inside the frame. */
export const innerOptions = (options: RequiredOptions, size: number): RequiredOptions => ({
  ...options,
  width: size,
  height: size,
  margin: 0,
  frameOptions: undefined,
  labelOptions: undefined,
  plugins: undefined
});

/** Area behind the logo: the logo box including its margin, with rounded corners. */
export const getLogoPlate = (
  options: RequiredOptions,
  dx: number,
  dy: number,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number; radius: number } => {
  const ratio = Math.min(0.5, Math.max(0, options.imageOptions.backgroundRadius ?? 0.2));
  return {
    x: dx - options.imageOptions.margin,
    y: dy - options.imageOptions.margin,
    width,
    height,
    radius: ratio * Math.min(width, height)
  };
};
