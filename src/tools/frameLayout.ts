import { RequiredOptions } from "../core/QROptions";

export interface FrameLayout {
  width: number;
  height: number;
  /** Where the QR code goes, as a square. */
  qr: { x: number; y: number; size: number };
  frame?: { thickness: number; radius: number; color: string };
  label?: {
    text: string;
    band: { x: number; y: number; width: number; height: number };
    color: string;
    font: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
  };
  background: string;
}

export const hasFrame = (options: RequiredOptions): boolean => !!(options.frameOptions || options.labelOptions?.text);

export default function getFrameLayout(options: RequiredOptions): FrameLayout {
  const { width, height } = options;
  const unit = Math.min(width, height);
  const frame = options.frameOptions;
  const label = options.labelOptions?.text ? options.labelOptions : undefined;

  const thickness = frame ? Math.max(0, frame.width ?? Math.round(unit * 0.04)) : 0;
  const padding = Math.max(0, frame?.padding ?? (frame ? Math.round(unit * 0.04) : options.margin));
  const fontSize = label ? (label.fontSize ?? Math.max(8, Math.round(unit * 0.07))) : 0;
  const bandHeight = label ? Math.round(fontSize * 1.8) : 0;
  const position = label?.position === "top" ? "top" : "bottom";

  const innerX = thickness;
  const innerY = thickness;
  const innerWidth = width - 2 * thickness;
  const innerHeight = height - 2 * thickness;
  const qrRegionY = position === "top" ? innerY + bandHeight : innerY;
  const qrRegionHeight = innerHeight - bandHeight;
  const size = Math.floor(Math.min(innerWidth, qrRegionHeight) - 2 * padding);

  if (size <= 0) throw new Error("frameOptions/labelOptions leave no room for the QR code; increase width/height");

  const frameColor = frame?.color ?? "#000";
  const fontFamily = label?.fontFamily ?? "Helvetica, Arial, sans-serif";
  const fontWeight = String(label?.fontWeight ?? "bold");

  return {
    width,
    height,
    qr: {
      x: Math.round(innerX + (innerWidth - size) / 2),
      y: Math.round(qrRegionY + (qrRegionHeight - size) / 2),
      size
    },
    frame: frame ? { thickness, radius: Math.max(0, frame.radius ?? 0), color: frameColor } : undefined,
    label: label
      ? {
          text: label.text,
          band: {
            x: innerX,
            y: position === "top" ? innerY : innerY + innerHeight - bandHeight,
            width: innerWidth,
            height: bandHeight
          },
          color: label.color ?? (frame ? "#fff" : options.dotsOptions.color || "#000"),
          font: `${fontWeight} ${fontSize}px ${fontFamily}`,
          fontSize,
          fontFamily,
          fontWeight
        }
      : undefined,
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
  labelOptions: undefined
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
