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
