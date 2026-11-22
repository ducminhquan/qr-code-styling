import { Options } from "../types";

/**
 * True when two options objects describe the same code, so wrappers can skip redrawing when a parent
 * re-renders with a new but equal object. Functions and objects like nodeCanvas or plugins are compared by
 * reference; everything else by value.
 */
export default function sameOptions(a?: Partial<Options>, b?: Partial<Options>): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const references: unknown[][] = [[], []];
  const serialize = (options: Partial<Options>, index: number): string =>
    JSON.stringify(options, (_key, value) => {
      if (typeof value === "function" || (value && typeof value === "object" && !isPlain(value))) {
        references[index].push(value);
        return `#ref${references[index].length}`;
      }
      return value;
    });
  if (serialize(a, 0) !== serialize(b, 1)) return false;
  return references[0].every((value, index) => value === references[1][index]);
}

const isPlain = (value: object): boolean => {
  if (Array.isArray(value)) return true;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** Copy of the options for a later sameOptions() check: plain objects and arrays are copied, the rest kept. */
export function snapshotOptions<T>(value: T): T {
  if (Array.isArray(value)) return value.map(snapshotOptions) as unknown as T;
  if (value && typeof value === "object" && isPlain(value as unknown as object)) {
    const copy: Record<string, unknown> = {};
    Object.keys(value as unknown as object).forEach((key) => {
      copy[key] = snapshotOptions((value as unknown as Record<string, unknown>)[key]);
    });
    return copy as T;
  }
  return value;
}
