/**
 * A tiny stand-in for a canvas 2D context that records path calls (with translate/rotate) as one SVG path.
 * The canvas dot figures draw into it, so all dots of an SVG code become a single <path> element instead of
 * one element per module: smaller files and faster rendering.
 */
const fmt = (value: number): string => String(Math.round(value * 1000) / 1000);

export default class PathRecorder {
  private _m = [1, 0, 0, 1, 0, 0];
  private _parts: string[] = [];
  private _open = false;

  get d(): string {
    return this._parts.join("");
  }

  beginPath(): void {
    // Everything goes into one path.
  }

  translate(x: number, y: number): void {
    const [a, b, c, d, e, f] = this._m;
    this._m = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
  }

  rotate(angle: number): void {
    const [a, b, c, d, e, f] = this._m;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this._m = [a * cos + c * sin, b * cos + d * sin, c * cos - a * sin, d * cos - b * sin, e, f];
  }

  private _point(x: number, y: number): [number, number] {
    const [a, b, c, d, e, f] = this._m;
    return [a * x + c * y + e, b * x + d * y + f];
  }

  moveTo(x: number, y: number): void {
    const [px, py] = this._point(x, y);
    this._parts.push(`M${fmt(px)} ${fmt(py)}`);
    this._open = true;
  }

  lineTo(x: number, y: number): void {
    if (!this._open) return this.moveTo(x, y);
    const [px, py] = this._point(x, y);
    this._parts.push(`L${fmt(px)} ${fmt(py)}`);
  }

  closePath(): void {
    if (!this._open) return;
    this._parts.push("Z");
    this._open = false;
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  arc(cx: number, cy: number, r: number, start: number, end: number, anticlockwise = false): void {
    let sweep = anticlockwise ? start - end : end - start;
    const full = sweep >= 2 * Math.PI - 1e-9;
    if (!full) {
      sweep %= 2 * Math.PI;
      if (sweep < 0) sweep += 2 * Math.PI;
    }
    const direction = anticlockwise ? -1 : 1;
    const at = (angle: number): [number, number] => this._point(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    const [sx, sy] = at(start);
    if (this._open) this._parts.push(`L${fmt(sx)} ${fmt(sy)}`);
    else {
      this._parts.push(`M${fmt(sx)} ${fmt(sy)}`);
      this._open = true;
    }
    const segment = (to: number, length: number): void => {
      const [ex, ey] = at(to);
      this._parts.push(
        `A${fmt(r)} ${fmt(r)} 0 ${length > Math.PI ? 1 : 0} ${anticlockwise ? 0 : 1} ${fmt(ex)} ${fmt(ey)}`
      );
    };
    if (full) {
      segment(start + direction * Math.PI, Math.PI);
      segment(start + direction * 2 * Math.PI, Math.PI);
    } else if (sweep > 1e-9) {
      segment(start + direction * sweep, sweep);
    }
  }
}
