import { RequiredOptions } from "../core/QROptions";
import { CornerDotType, CornerSquareType, DotType } from "../types";

/**
 * Dot types whose shape would break the finder patterns if the corners were drawn with them.
 * When one of these is used and no corner type is set, the corners are drawn as solid squares.
 */
const SOLID_CORNER_DOT_TYPES: DotType[] = ["diamond", "small-square", "vertical-lines", "horizontal-lines"];

/** True when alignment patterns must be drawn as plain squares for this dot type to scan. */
export const needsSolidAlignment = (type: DotType): boolean => SOLID_CORNER_DOT_TYPES.indexOf(type) !== -1;

export default function getCornerTypes(options: RequiredOptions): {
  square?: CornerSquareType;
  dot?: CornerDotType;
} {
  const solid = SOLID_CORNER_DOT_TYPES.indexOf(options.dotsOptions.type) !== -1;
  return {
    square: options.cornersSquareOptions?.type || (solid ? "square" : undefined),
    dot: options.cornersDotOptions?.type || (solid ? "square" : undefined)
  };
}
