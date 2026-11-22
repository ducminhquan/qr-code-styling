import { RequiredOptions } from "../core/QROptions";
import { Shape } from "../figures/shapes";
import { CircleLayout, getCircleLayout } from "./circle";

/**
 * Shaped QR codes (shape: "circle", "heart", "hexagon", "diamond"...). Like the round code, the real code
 * stays a square in the middle with an empty one-module ring around it, and the rest of the shape is filled
 * with decorative modules. Scanners only read inside the finder patterns, so the code keeps scanning.
 */
export interface ShapeLayout extends CircleLayout {
  /** The outline in pixels, for the background, given the square it fills. */
  outline: (x: number, y: number, size: number) => Shape;
}

type Point = [number, number];

/** Outlines in a [-1, 1] box, y pointing down. */
const regular = (sides: number, rotation: number): Point[] =>
  Array.from({ length: sides }, (_, k) => {
    const angle = rotation + (k * 2 * Math.PI) / sides;
    return [Math.cos(angle), Math.sin(angle)] as Point;
  });

/** Scales and centers points to fill the [-1, 1] box. */
const fit = (points: Point[]): Point[] => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = 2 / Math.max(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return points.map(([x, y]) => [(x - cx) * scale, (y - cy) * scale] as Point);
};

const heart = (): Point[] =>
  Array.from({ length: 160 }, (_, k) => {
    const t = (k / 160) * 2 * Math.PI;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x, -y] as Point;
  });

/** Polygon outlines of the shapes besides "square" and "circle". */
export const SHAPE_OUTLINES: Record<string, () => Point[]> = {
  heart: () => fit(heart()),
  hexagon: () => fit(regular(6, 0)),
  octagon: () => fit(regular(8, Math.PI / 8)),
  diamond: () => fit(regular(4, Math.PI / 2))
};

const inside = (polygon: Point[], x: number, y: number): boolean => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
};

const cache = new Map<string, ShapeLayout>();

/** Deterministic noise, so the same data always draws the same picture. */
const noise = (i: number, j: number, count: number): boolean => {
  let h = Math.imul(i + 1013, 0x27d4eb2d) ^ Math.imul(j + 7919, 0x165667b1) ^ Math.imul(count, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) % 100 < 45;
};

export function getPolygonLayout(name: string, count: number): ShapeLayout {
  const key = `${name}:${count}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const polygon = SHAPE_OUTLINES[name]();

  // Grow the grid (keeping the code centered) until the code and its ring fit inside the outline.
  const fits = (size: number): boolean => {
    const pad = (size - count) / 2;
    const toUnit = (p: number): number => ((p + pad) / size) * 2 - 1;
    // Sample the edges of the ring square every half module.
    for (let p = -1; p <= count + 1; p += 0.5) {
      for (const [x, y] of [
        [p, -1],
        [p, count + 1],
        [-1, p],
        [count + 1, p]
      ]) {
        if (!inside(polygon, toUnit(x), toUnit(y))) return false;
      }
    }
    return true;
  };
  let size = count + 4;
  while (!fits(size)) size += 2;
  // One more module all round, so decoration frames the code rather than touching the outline.
  size += 2;
  const pad = (size - count) / 2;
  const toUnit = (p: number): number => ((p + pad) / size) * 2 - 1;

  const isDecoration = (i: number, j: number): boolean => {
    if (i >= -1 && i <= count && j >= -1 && j <= count) return false;
    if (i < -pad || j < -pad || i >= count + pad || j >= count + pad) return false;
    // The whole module must be inside the outline.
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1]
    ]) {
      if (!inside(polygon, toUnit(i + dx), toUnit(j + dy))) return false;
    }
    return noise(i, j, count);
  };

  const outline = (x: number, y: number, outlineSize: number): Shape => {
    const at = ([u, v]: Point): { x: number; y: number } => ({
      x: x + ((u + 1) / 2) * outlineSize,
      y: y + ((v + 1) / 2) * outlineSize
    });
    const shape: Shape = polygon.map((point, index) => ({ op: index ? "L" : "M", ...at(point) }) as Shape[number]);
    shape.push({ op: "Z" });
    return shape;
  };

  const layout = { size, pad, isDecoration, outline };
  cache.set(key, layout);
  return layout;
}

/** The layout of a shaped code, or undefined for a plain square code. */
export function getShapeLayout(options: Pick<RequiredOptions, "shape">, count: number): ShapeLayout | undefined {
  const shape = options.shape;
  if (!shape || shape === "square") return undefined;
  if (shape === "circle") {
    return {
      ...getCircleLayout(count),
      outline: (x, y, size) => [
        { op: "M", x: x + size, y: y + size / 2 },
        { op: "A", cx: x + size / 2, cy: y + size / 2, r: size / 2, start: 0, end: Math.PI * 2 },
        { op: "Z" }
      ]
    };
  }
  if (!SHAPE_OUTLINES[shape]) return undefined;
  return getPolygonLayout(shape, count);
}
