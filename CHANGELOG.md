# Changelog

## 1.8.0

QR art and scan checking. Without the new options, output is unchanged.

### Added
- `art` option: blend a picture into the QR code. `halftone` mode redraws the picture as fine pixels around the QR modules (optionally in the picture's colors); `colorize` mode paints the dots, in any dot style, with the picture. Finder, timing, alignment, format and version patterns are kept solid. Works for canvas and SVG output, in the browser and on Node (with node-canvas).
- `verify({ decoder })`: renders the code and decodes it with a decoder you pass in (for example jsQR), and reports whether it reads back the same data. Works with a canvas, or with resvg on a server.
- `verify({ decoder, adjust: true })`: for QR art, raises `art.contrast` step by step until the code scans.

## 1.7.0

Server-side rendering without extra packages. Everything that worked in 1.6.0 works the same.

### Added
- SVG output on Node.js and other DOM-less runtimes with no `jsdom` and no `canvas`. Output is byte-identical to the jsdom path, and about 6x faster (3.4 ms instead of 21 ms per QR code in `npm run bench`).
- Logos are read without a canvas on the server: PNG, JPEG, GIF, WebP and SVG, from data URLs or http(s) URLs (via `fetch`). With `saveAsBlob`, the original logo bytes are embedded, so a vector logo stays vector.
- New `resvg` option: pass `Resvg` from `@resvg/resvg-js` to get png on a server without node-canvas.
- A clear error message when png/jpeg/webp is requested on a server with neither node-canvas nor resvg. Creating a `QRCodeStyling` there no longer throws when `type` is left at its default.
- `npm run bench` to measure rendering speed.

### Fixed
- `saveAsBlob` with node-canvas no longer prints the whole image data URL to the console.

## 1.6.0

`qr-code-styling-node` is now developed independently from the original `qr-code-styling`.
No API changes: every option, method and import path from 1.5.0 works the same, and rendering
output is checked against 1.5.0 by an automated test.

### Added
- ES module build (`lib/qr-code-styling.mjs`) and an `exports` map, so `import QRCodeStyling from "qr-code-styling-node"` works in Node and bundlers.
- `require("qr-code-styling-node")` now works directly on Node.js (1.5.0 crashed with `self is not defined`; the `lib/qr-code-styling.common.js` path is still supported).
- Continuous integration on Node.js 18, 20 and 22.

### Changed
- Toolchain upgraded: TypeScript 5, webpack 5 (latest), esbuild for the ES module build, Vitest instead of Jest, ESLint 9 and Prettier 3.
- Image tests compare pixels instead of PNG bytes, so they no longer break when node-canvas or zlib changes.
- README, package metadata and license updated for the independent project.
