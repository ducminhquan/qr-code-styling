/**
 * Which modules of a QR symbol are function patterns (finders, timing, alignment, format and
 * version information). QR art leaves these solid so scanners can still locate and read the code.
 */

// Alignment pattern centre coordinates per version (ISO/IEC 18004, Annex E).
const ALIGNMENT_POSITIONS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170]
];

export type ModuleRole = "finder" | "function" | "data";

/** Returns a lookup of module roles for a symbol with `count` modules per side. */
export default function getModuleRoles(count: number): (row: number, col: number) => ModuleRole {
  const version = (count - 17) / 4;
  const roles = new Uint8Array(count * count); // 0 data, 1 function, 2 finder
  const mark = (row: number, col: number, role: number): void => {
    if (row >= 0 && col >= 0 && row < count && col < count) roles[row * count + col] = role;
  };

  // Finder patterns with their separators (8x8 at three corners).
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      mark(r, c, 2);
      mark(r, count - 1 - c, 2);
      mark(count - 1 - r, c, 2);
    }
  }

  // Timing patterns.
  for (let i = 8; i < count - 8; i++) {
    mark(6, i, 1);
    mark(i, 6, 1);
  }

  // Alignment patterns (skipping the ones that overlap finders).
  const positions = ALIGNMENT_POSITIONS[version - 1] || [];
  positions.forEach((row) =>
    positions.forEach((col) => {
      if (roles[row * count + col] === 2) return;
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) mark(row + r, col + c, 1);
    })
  );

  // Format information around the finders, and the dark module.
  for (let i = 0; i < 9; i++) {
    if (roles[8 * count + i] !== 2) mark(8, i, 1);
    if (roles[i * count + 8] !== 2) mark(i, 8, 1);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, count - 1 - i, 1);
    mark(count - 1 - i, 8, 1);
  }

  // Version information (version 7 and up).
  if (version >= 7) {
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 3; b++) {
        mark(a, count - 11 + b, 1);
        mark(count - 11 + b, a, 1);
      }
    }
  }

  return (row, col) => (["data", "function", "finder"] as ModuleRole[])[roles[row * count + col]];
}
