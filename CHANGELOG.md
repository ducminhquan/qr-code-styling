# Changelog

## 2.0.0

Everything listed under 1.6.0 to 1.14.0 below, which were developed in this repository after 1.5.0. Those
versions are also on npm under the dist-tag `previous`; 2.0.0 is the one to install. The options API is the same: code written for 1.5.0 keeps
working and draws the same picture, and every new feature is opt-in. The major version marks the size of the
update and two changes in behaviour worth knowing about:

- Node 18 or newer is required.
- Text with characters outside Latin-1 (Vietnamese, emoji, CJK) is encoded as UTF-8, so it now reads back
  correctly. Codes for Latin-1 text do not change.

Highlights: server-side SVG and PNG without jsdom or node-canvas, QR art (`halftone`, `colorize`, `blend`) with
`verify()`, 14 dot types including `fluid`, `wave`, `blob` and `circuit`, frames and labels, round codes,
payload builders, `share()`, plugins, and React and Vue wrappers. Try them in the
[playground](https://ducminhquan.github.io/qr-code-styling/).

### Release
- Published from GitHub Actions with npm Trusted Publishing (no token) when a GitHub release is created, with provenance. Running the workflow by hand publishes 1.6.0 to 1.14.0 from their own commits.

## 1.14.0

React and Vue wrappers. The core and its output are unchanged.

### Added
- `qr-code-styling-node/react`: `<QRCode options={...} />`, with a ref to the `QRCodeStyling` instance and an `onUpdate` callback.
- `qr-code-styling-node/vue`: `<QRCode :options="..." />` for Vue 3, exposing `qrCode`, `download`, `share` and `getRawData`, and emitting `update`.
- Both redraw only when the options change by value, and import the core build instead of bundling a copy (about 2 KB each). React and Vue are optional peer dependencies.

## 1.13.0

Plugins. Without plugins, output is unchanged.

### Added
- `plugins` option: each plugin can `configure(options)` (return option changes, merged before drawing) and `afterDraw(draw)` (draw on the canvas context or into the SVG, with the code's area in pixels, frames included). Async hooks are awaited and plugins run in order. Works in the browser and on Node, including the built-in SVG DOM.

## 1.12.0

New dot types and smaller SVG files. Existing options render exactly as before.

### Added
- Dot types `wave` (rows flow into chains of soft beads), `blob` (each module gets its own hand-drawn corners) and `circuit` (round pads with thin traces to neighbours). Like `fluid`, finders and alignment patterns are drawn solid and rounded unless a corner type is set.
- `svgOptions.mergePaths`: draws all dots (and finders made of dots) as one SVG path. Same picture, 15-50% smaller files depending on the dot type, faster rendering.

## 1.11.0

Round codes, data builders and sharing. Existing options render exactly as before, except text with characters
outside Latin-1 (see Fixed).

### Added
- `shape: "circle"`: a round QR code. The real code stays in the middle with an empty ring around it; the rest of the circle is filled with decorative dots in the same style, and the background is a circle. Finders are drawn solid (rounded with round dot types).
- `QRCodeStyling.payload` (also a named export `payload`): `wifi`, `vCard`, `event`, `email`, `phone`, `sms` and `geo` build the data string for common QR codes, with each format's escaping.
- `share()`: opens the phone's share sheet with the code as a file (Web Share API), and downloads it where sharing files is not supported.

### Fixed
- Text with characters outside Latin-1 (most Vietnamese, emoji, CJK) is now encoded as UTF-8. Before, only the low byte of each character was kept, so these codes read back as the wrong text. Latin-1 text keeps the old encoding, so those codes do not change.
- `fluid` dots draw alignment patterns as solid squares, which some decorations could otherwise imitate.

## 1.10.0

Illustration-style QR art. Without the new options, output is unchanged.

### Added
- `art.mode: "blend"`: the picture fills the whole image and dots are drawn only where it is not already dark or light enough for the code. Finders take a dark color from the picture and sit on a light plate; alignment patterns stay whole. Round dot types give round (`rounded`) finders.
- `art.placement: { x, y, size }`: put the code in one square of a larger picture.
- Dot type `fluid`: neighbouring dots join into soft strokes and a lone dot is a circle. Finders are drawn solid and rounded unless a corner type is set.

## 1.9.0

More styles, frames and labels. Existing options render exactly as before.

### Added
- Dot types `diamond`, `small-square`, `vertical-lines` and `horizontal-lines`. With these, finder and alignment patterns stay solid unless a corner type is set, so the code keeps scanning.
- Corner types `rounded` for `cornersSquareOptions` and `cornersDotOptions`.
- `frameOptions`: a border with optional rounded corners around the code.
- `labelOptions`: a line of text (Unicode, including Vietnamese) above or below the code, on the frame band or on its own.
- `imageOptions.backgroundColor` and `imageOptions.backgroundRadius`: a plate behind the logo.
- The built-in SVG DOM supports text, so labels work on Node without jsdom.

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
