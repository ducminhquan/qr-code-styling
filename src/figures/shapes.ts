/**
 * Shapes shared by the canvas and SVG renderers. A shape is a list of path commands in absolute
 * coordinates; `toCanvas` replays them on a 2D context and `toSVGPath` turns them into a path "d".
 * Sub-paths of one module never overlap their neighbours, so the even-odd fill used by the
 * renderers only cuts the holes that are meant to be holes (corner rings).
 */

export type PathCommand =
  | { op: "M" | "L"; x: number; y: number }
  /** Circular arc around (cx, cy), angles in radians, clockwise on screen unless anticlockwise. */
  | { op: "A"; cx: number; cy: number; r: number; start: number; end: number; anticlockwise?: boolean }
  | { op: "Z" };

export type Shape = PathCommand[];

export function toCanvas(context: CanvasRenderingContext2D, shape: Shape): void {
  shape.forEach((command) => {
    if (command.op === "M") context.moveTo(command.x, command.y);
    else if (command.op === "L") context.lineTo(command.x, command.y);
    else if (command.op === "A")
      context.arc(command.cx, command.cy, command.r, command.start, command.end, !!command.anticlockwise);
    else context.closePath();
  });
}

const round = (value: number): number => Math.round(value * 1000) / 1000;

export function toSVGPath(shape: Shape): string {
  const parts: string[] = [];
  shape.forEach((command) => {
    if (command.op === "M" || command.op === "L") {
      parts.push(`${command.op} ${round(command.x)} ${round(command.y)}`);
    } else if (command.op === "A") {
      const { cx, cy, r, start, end, anticlockwise } = command;
      let sweep = anticlockwise ? start - end : end - start;
      while (sweep < 0) sweep += 2 * Math.PI;
      parts.push(`L ${round(cx + r * Math.cos(start))} ${round(cy + r * Math.sin(start))}`);
      parts.push(
        `A ${round(r)} ${round(r)} 0 ${sweep > Math.PI ? 1 : 0} ${anticlockwise ? 0 : 1} ` +
          `${round(cx + r * Math.cos(end))} ${round(cy + r * Math.sin(end))}`
      );
    } else {
      parts.push("Z");
    }
  });
  return parts.join(" ");
}

export const diamond = (x: number, y: number, size: number): Shape => [
  { op: "M", x: x + size / 2, y },
  { op: "L", x: x + size, y: y + size / 2 },
  { op: "L", x: x + size / 2, y: y + size },
  { op: "L", x, y: y + size / 2 },
  { op: "Z" }
];

export const rect = (x: number, y: number, width: number, height: number): Shape => [
  { op: "M", x, y },
  { op: "L", x: x + width, y },
  { op: "L", x: x + width, y: y + height },
  { op: "L", x, y: y + height },
  { op: "Z" }
];

export const smallSquare = (x: number, y: number, size: number): Shape => {
  const inset = size * 0.15;
  return rect(x + inset, y + inset, size - 2 * inset, size - 2 * inset);
};

/**
 * A bar that joins its neighbours along one axis and gets a round cap where it has none.
 * `before`/`after` are the neighbours above/below (vertical) or left/right (horizontal).
 */
export const line = (x: number, y: number, size: number, vertical: boolean, before: boolean, after: boolean): Shape => {
  const thickness = size * 0.8;
  const r = thickness / 2;
  const offset = (size - thickness) / 2;

  if (vertical) {
    const left = x + offset;
    const right = left + thickness;
    const cx = x + size / 2;
    const shape: Shape = [];
    if (before) shape.push({ op: "M", x: left, y }, { op: "L", x: right, y });
    else shape.push({ op: "M", x: left, y: y + r }, { op: "A", cx, cy: y + r, r, start: Math.PI, end: 0 });
    if (after) shape.push({ op: "L", x: right, y: y + size }, { op: "L", x: left, y: y + size });
    else
      shape.push({ op: "L", x: right, y: y + size - r }, { op: "A", cx, cy: y + size - r, r, start: 0, end: Math.PI });
    shape.push({ op: "Z" });
    return shape;
  }

  const top = y + offset;
  const bottom = top + thickness;
  const cy = y + size / 2;
  const shape: Shape = [];
  if (before) shape.push({ op: "M", x, y: bottom }, { op: "L", x, y: top });
  else
    shape.push(
      { op: "M", x: x + r, y: bottom },
      { op: "A", cx: x + r, cy, r, start: Math.PI / 2, end: (3 * Math.PI) / 2 }
    );
  if (after) shape.push({ op: "L", x: x + size, y: top }, { op: "L", x: x + size, y: bottom });
  else
    shape.push(
      { op: "L", x: x + size - r, y: top },
      { op: "A", cx: x + size - r, cy, r, start: -Math.PI / 2, end: Math.PI / 2 }
    );
  shape.push({ op: "Z" });
  return shape;
};

/** Rounded rectangle, drawn clockwise. */
export const roundedRect = (x: number, y: number, width: number, height: number, radius: number): Shape => {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    { op: "M", x: x + r, y },
    { op: "L", x: x + width - r, y },
    { op: "A", cx: x + width - r, cy: y + r, r, start: -Math.PI / 2, end: 0 },
    { op: "L", x: x + width, y: y + height - r },
    { op: "A", cx: x + width - r, cy: y + height - r, r, start: 0, end: Math.PI / 2 },
    { op: "L", x: x + r, y: y + height },
    { op: "A", cx: x + r, cy: y + height - r, r, start: Math.PI / 2, end: Math.PI },
    { op: "L", x, y: y + r },
    { op: "A", cx: x + r, cy: y + r, r, start: Math.PI, end: (3 * Math.PI) / 2 },
    { op: "Z" }
  ];
};

/** Finder ring with rounded corners: outer square minus inner square (even-odd). */
export const roundedRing = (x: number, y: number, size: number): Shape => {
  const module = size / 7;
  return roundedRect(x, y, size, size, module * 1.5).concat(
    roundedRect(x + module, y + module, size - 2 * module, size - 2 * module, module * 0.75)
  );
};

export const roundedSquare = (x: number, y: number, size: number): Shape => roundedRect(x, y, size, size, size * 0.25);

/**
 * "fluid" dot: a rounded square that flows into its dark neighbours, so runs of modules read as
 * soft connected strokes and a lone module is a circle. Arms stay inside the module's own cell,
 * so neighbouring shapes touch but never overlap.
 */
export const fluid = (
  x: number,
  y: number,
  size: number,
  neighbors: { left: boolean; right: boolean; top: boolean; bottom: boolean }
): Shape => {
  const { left, right, top, bottom } = neighbors;
  const inset = size * 0.1;
  const x0 = x + inset;
  const x1 = x + size - inset;
  const y0 = y + inset;
  const y1 = y + size - inset;
  const r = (size - 2 * inset) / 2;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const roundTL = !left && !top;
  const roundTR = !top && !right;
  const roundBR = !right && !bottom;
  const roundBL = !bottom && !left;

  const shape: Shape = [{ op: "M", x: roundTL ? cx : x0, y: y0 }];
  if (top) shape.push({ op: "L", x: x0, y }, { op: "L", x: x1, y }, { op: "L", x: x1, y: y0 });
  if (roundTR) shape.push({ op: "A", cx, cy, r, start: -Math.PI / 2, end: 0 });
  else shape.push({ op: "L", x: x1, y: y0 });
  if (right) shape.push({ op: "L", x: x + size, y: y0 }, { op: "L", x: x + size, y: y1 }, { op: "L", x: x1, y: y1 });
  if (roundBR) shape.push({ op: "A", cx, cy, r, start: 0, end: Math.PI / 2 });
  else shape.push({ op: "L", x: x1, y: y1 });
  if (bottom) shape.push({ op: "L", x: x1, y: y + size }, { op: "L", x: x0, y: y + size }, { op: "L", x: x0, y: y1 });
  if (roundBL) shape.push({ op: "A", cx, cy, r, start: Math.PI / 2, end: Math.PI });
  else shape.push({ op: "L", x: x0, y: y1 });
  if (left) shape.push({ op: "L", x, y: y1 }, { op: "L", x, y: y0 }, { op: "L", x: x0, y: y0 });
  if (roundTL) shape.push({ op: "A", cx, cy, r, start: Math.PI, end: (3 * Math.PI) / 2 });
  shape.push({ op: "Z" });
  return shape;
};

type Neighbors = { left: boolean; right: boolean; top: boolean; bottom: boolean };

/**
 * Clockwise arc from (x0, y0) to (x1, y1) that bulges by `sagitta` to the left of the direction of travel
 * (outwards for a clockwise outline).
 */
const bulgeArc = (x0: number, y0: number, x1: number, y1: number, sagitta: number): PathCommand => {
  const chord = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
  const r = (chord * chord) / (8 * sagitta) + sagitta / 2;
  // Unit normal pointing to the left of travel in screen coordinates (y down) is (dy, -dx).
  const nx = (y1 - y0) / chord;
  const ny = -(x1 - x0) / chord;
  const cx = (x0 + x1) / 2 - nx * (r - sagitta);
  const cy = (y0 + y1) / 2 - ny * (r - sagitta);
  return { op: "A", cx, cy, r, start: Math.atan2(y0 - cy, x0 - cx), end: Math.atan2(y1 - cy, x1 - cx) };
};

/**
 * "wave" dot: modules in a row flow into each other as a chain of soft beads; a run's ends are round.
 * Only horizontal neighbours connect.
 */
export const wave = (x: number, y: number, size: number, { left, right }: Neighbors): Shape => {
  const half = size * 0.3;
  const bulge = size * 0.1;
  const cy = y + size / 2;
  const x0 = left ? x : x + half;
  const x1 = right ? x + size : x + size - half;
  const shape: Shape = [{ op: "M", x: x0, y: cy - half }];
  shape.push(bulgeArc(x0, cy - half, x1, cy - half, bulge));
  if (right) shape.push({ op: "L", x: x1, y: cy + half });
  else shape.push({ op: "A", cx: x1, cy, r: half, start: -Math.PI / 2, end: Math.PI / 2 });
  shape.push(bulgeArc(x1, cy + half, x0, cy + half, bulge));
  if (left) shape.push({ op: "L", x: x0, y: cy - half });
  else shape.push({ op: "A", cx: x0, cy, r: half, start: Math.PI / 2, end: (3 * Math.PI) / 2 });
  shape.push({ op: "Z" });
  return shape;
};

/** Small deterministic noise from a position, in [0, 1). */
const noise = (a: number, b: number, salt: number): number => {
  let h = Math.imul(Math.round(a * 16) + 0x9e37, 0x27d4eb2d) ^ Math.imul(Math.round(b * 16) + salt, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

/** "blob" dot: a hand-drawn looking rounded square; each module gets its own corner radii and size. */
export const blob = (x: number, y: number, size: number): Shape => {
  const inset = size * (0.03 + 0.07 * noise(x, y, 1));
  const left = x + inset;
  const top = y + inset;
  const side = size - 2 * inset;
  const radius = (k: number): number => side * (0.25 + 0.25 * noise(x, y, k + 2));
  const [tl, tr, br, bl] = [radius(0), radius(1), radius(2), radius(3)];
  return [
    { op: "M", x: left + tl, y: top },
    { op: "L", x: left + side - tr, y: top },
    { op: "A", cx: left + side - tr, cy: top + tr, r: tr, start: -Math.PI / 2, end: 0 },
    { op: "L", x: left + side, y: top + side - br },
    { op: "A", cx: left + side - br, cy: top + side - br, r: br, start: 0, end: Math.PI / 2 },
    { op: "L", x: left + bl, y: top + side },
    { op: "A", cx: left + bl, cy: top + side - bl, r: bl, start: Math.PI / 2, end: Math.PI },
    { op: "L", x: left, y: top + tl },
    { op: "A", cx: left + tl, cy: top + tl, r: tl, start: Math.PI, end: (3 * Math.PI) / 2 },
    { op: "Z" }
  ];
};

/**
 * "circuit" dot: a round pad with thin traces to its dark neighbours, like a printed circuit board.
 * One outline per module, so traces never overlap the pad (the renderers fill with even-odd).
 */
export const circuit = (x: number, y: number, size: number, neighbors: Neighbors): Shape => {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.36;
  const w = size * 0.17; // half the trace width
  const alpha = Math.asin(w / r);
  const arms = [
    { on: neighbors.top, angle: -Math.PI / 2 },
    { on: neighbors.right, angle: 0 },
    { on: neighbors.bottom, angle: Math.PI / 2 },
    { on: neighbors.left, angle: Math.PI }
  ].filter((arm) => arm.on);

  if (!arms.length) {
    return [
      { op: "M", x: cx + r, y: cy },
      { op: "A", cx, cy, r, start: 0, end: Math.PI },
      { op: "A", cx, cy, r, start: Math.PI, end: 2 * Math.PI },
      { op: "Z" }
    ];
  }

  const point = (angle: number): { x: number; y: number } => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  });
  // Moves a point on the pad out to the cell edge, along the arm's direction.
  const toEdge = (angle: number, at: { x: number; y: number }): { x: number; y: number } => {
    const reach = size / 2 - r * Math.cos(alpha);
    return { x: at.x + reach * Math.cos(angle), y: at.y + reach * Math.sin(angle) };
  };

  const first = point(arms[0].angle + alpha);
  const shape: Shape = [{ op: "M", x: first.x, y: first.y }];
  for (let k = 0; k < arms.length; k++) {
    const from = arms[k].angle + alpha;
    const next = arms[(k + 1) % arms.length];
    let to = next.angle - alpha;
    if (k === arms.length - 1 || to <= from) to += 2 * Math.PI;
    if (to - from > 1e-6) shape.push({ op: "A", cx, cy, r, start: from, end: to });
    const a = point(next.angle - alpha);
    const b = point(next.angle + alpha);
    const ea = toEdge(next.angle, a);
    const eb = toEdge(next.angle, b);
    shape.push({ op: "L", x: ea.x, y: ea.y }, { op: "L", x: eb.x, y: eb.y }, { op: "L", x: b.x, y: b.y });
  }
  shape.push({ op: "Z" });
  return shape;
};
