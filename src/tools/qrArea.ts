import { RequiredOptions } from "../core/QROptions";
import { getShapeLayout } from "./codeShape";

export interface QRArea {
  count: number;
  /** Size of one module in pixels. */
  dotSize: number;
  /** Top-left corner of the code (without margin). */
  x: number;
  y: number;
}

/**
 * Where the code sits in the output. By default it is centered and fills the size minus the margin.
 * With art.placement it sits in that square of the picture instead.
 */
export default function getQRArea(options: RequiredOptions, count: number): QRArea {
  const placement = options.art?.placement;
  if (placement && placement.size > 0) {
    const dotSize = Math.floor(placement.size / (getShapeLayout(options, count)?.size ?? count));
    return {
      count,
      dotSize,
      x: Math.floor(placement.x + (placement.size - count * dotSize) / 2),
      y: Math.floor(placement.y + (placement.size - count * dotSize) / 2)
    };
  }
  const minSize = Math.min(options.width, options.height) - options.margin * 2;
  // A round code is drawn on a larger grid: the real code sits in the middle of the circle.
  const dotSize = Math.floor(minSize / (getShapeLayout(options, count)?.size ?? count));
  return {
    count,
    dotSize,
    x: Math.floor((options.width - count * dotSize) / 2),
    y: Math.floor((options.height - count * dotSize) / 2)
  };
}
