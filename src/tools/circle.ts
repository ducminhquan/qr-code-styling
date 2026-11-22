import { RequiredOptions } from "../core/QROptions";

/**
 * Round QR codes (shape: "circle"). The real code stays a square in the middle; the rest of the circle
 * is filled with decorative modules. A one-module empty ring around the real code keeps it readable,
 * as scanners ignore everything outside the finder patterns.
 */
export interface CircleLayout {
  /** Modules across the whole circle. */
  size: number;
  /** Decorative modules on each side of the real code. */
  pad: number;
  /** True for a dark decorative module. Always false inside the real code and its quiet ring. */
  isDecoration: (i: number, j: number) => boolean;
}

export const isCircle = (options: RequiredOptions): boolean => options.shape === "circle";

export function getCircleLayout(count: number): CircleLayout {
  // The circle must contain the code and its quiet ring: diameter >= (count + 2) * sqrt(2).
  let size = Math.ceil((count + 2) * Math.SQRT2) + 1;
  if ((size - count) % 2) size++;
  const pad = (size - count) / 2;
  const radius = size / 2;
  const center = count / 2;

  const isDecoration = (i: number, j: number): boolean => {
    if (i >= -1 && i <= count && j >= -1 && j <= count) return false;
    const dx = i + 0.5 - center;
    const dy = j + 0.5 - center;
    if (dx * dx + dy * dy > (radius - 0.5) * (radius - 0.5)) return false;
    // Deterministic noise, so the same data always draws the same picture.
    let h = Math.imul(i + 1013, 0x27d4eb2d) ^ Math.imul(j + 7919, 0x165667b1) ^ Math.imul(count, 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h ^= h >>> 13;
    return (h >>> 0) % 100 < 45;
  };

  return { size, pad, isDecoration };
}
