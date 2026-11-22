import { RequiredOptions } from "../core/QROptions";
import { CornerDotType, CornerSquareType, DotType } from "../types";

/**
 * Dot types whose shape would break the finder patterns if the corners were drawn with them.
 * When one of these is used and no corner type is set, the corners are drawn as solid squares.
 */
const SOLID_CORNER_DOT_TYPES: DotType[] = ["diamond", "small-square", "vertical-lines", "horizontal-lines"];

/** Dot types with a round look; blend art matches its corners and correction dots to them. */
export const ROUND_DOT_TYPES: DotType[] = ["dots", "rounded", "extra-rounded", "classy-rounded", "fluid"];

/** True when alignment patterns must be drawn as plain squares for this dot type to scan. */
export const needsSolidAlignment = (type: DotType): boolean => SOLID_CORNER_DOT_TYPES.indexOf(type) !== -1;

export default function getCornerTypes(options: RequiredOptions): {
  square?: CornerSquareType;
  dot?: CornerDotType;
} {
  const type = options.dotsOptions.type;
  if (options.art?.mode === "blend" || type === "fluid") {
    // Blend art draws only some of the dots, and fluid dots thin the finder rings, so finders
    // made of dots would not scan well: they are drawn solid, round when the dots are round.
    const round = ROUND_DOT_TYPES.indexOf(type) !== -1;
    return {
      square: options.cornersSquareOptions?.type || (round ? "rounded" : "square"),
      dot: options.cornersDotOptions?.type || (round ? "rounded" : "square")
    };
  }
  const solid = SOLID_CORNER_DOT_TYPES.indexOf(type) !== -1;
  return {
    square: options.cornersSquareOptions?.type || (solid ? "square" : undefined),
    dot: options.cornersDotOptions?.type || (solid ? "square" : undefined)
  };
}
