# QR Code Styling (Node)

[![npm](https://img.shields.io/npm/v/qr-code-styling-node.svg)](https://www.npmjs.com/package/qr-code-styling-node)
[![CI](https://github.com/ducminhquan/qr-code-styling/actions/workflows/ci.yml/badge.svg)](https://github.com/ducminhquan/qr-code-styling/actions/workflows/ci.yml)

Styled QR codes from one options object: dots, corners, colors, gradients, logos, frames, labels, round codes
and QR art. Works in the browser (canvas or SVG) and on Node.js, with a single dependency.

**[Try it in the playground](https://ducminhquan.github.io/qr-code-styling/)** — change options live, download
the result and copy the code.

<p float="left">
<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/facebook_example_new.png" width="200" />
<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/qr_code_example.png" width="200" />
<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/telegram_example_new.png" width="200" />
</p>
<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/blend_examples.png" width="620" />

**Why this library**

- **One options object.** Everything is an option; nothing to compose or subclass.
- **Framework-free and light.** One dependency (`qrcode-generator`). React and Vue wrappers are optional.
- **Pretty out of the box.** 14 dot styles, rounded corners, gradients, logos, frames, labels, round codes and QR art.
- **Runs anywhere.** Browser canvas or SVG; on Node, SVG works with no extra packages, PNG with `resvg` or `node-canvas`.
- **Checks itself.** `verify()` decodes the result so you know a styled code still scans.
- **Backward compatible.** Code written for 1.5.0 (or for the original `qr-code-styling`) keeps working and draws the same picture. New behaviour is always opt-in.

`qr-code-styling-node` is an independently maintained project. It started as a fork of
[qr-code-styling](https://github.com/kozakdenys/qr-code-styling) by Denys Kozak and keeps its API.
See [CHANGELOG.md](CHANGELOG.md) for what changed. Found a bug or have an idea?
[Open an issue](https://github.com/ducminhquan/qr-code-styling/issues).

## Contents

- [Installation](#installation)
- [Quick start](#quick-start): [browser](#in-the-browser), [bundler / TypeScript](#with-a-bundler-or-typescript), [React and Vue](#react-and-vue), [Node.js](#on-nodejs)
- Guides: [dots and corners](#dots-and-corners), [frames and labels](#frames-and-labels), [round codes](#round-codes),
  [QR art](#qr-art), [Wi-Fi, contacts and events](#wi-fi-contacts-events-and-more), [download and share](#download-and-share),
  [checking that a code scans](#checking-that-a-code-scans), [smaller SVG files](#smaller-svg-files), [plugins](#plugins)
- [API reference](#api-reference)
- [Upgrading from 1.5.0](#upgrading-from-150)
- [Development](#development)

## Installation

```
npm install qr-code-styling-node
```

Or load it from a CDN with a `<script>` tag. It defines a global `QRCodeStyling`:

```html
<script src="https://unpkg.com/qr-code-styling-node/lib/qr-code-styling.js"></script>
```

## Quick start

### In the browser

```html
<div id="qr"></div>
<script src="https://unpkg.com/qr-code-styling-node/lib/qr-code-styling.js"></script>
<script>
  const qrCode = new QRCodeStyling({
    width: 300,
    height: 300,
    type: "svg",
    data: "https://nhathuoclongchau.com.vn",
    image: "https://example.com/logo.svg",
    dotsOptions: { type: "rounded", color: "#1d4ed8" },
    cornersSquareOptions: { type: "extra-rounded" },
    backgroundOptions: { color: "#ffffff" },
    imageOptions: { crossOrigin: "anonymous", margin: 8 }
  });

  qrCode.append(document.getElementById("qr"));
  // later: qrCode.update({ data: "https://fptshop.com.vn" });
  // qrCode.download({ name: "qr", extension: "png" });
</script>
```

### With a bundler or TypeScript

```js
import QRCodeStyling, { dotTypes, payload } from "qr-code-styling-node";

const qrCode = new QRCodeStyling({ data: "https://example.com", dotsOptions: { type: dotTypes.fluid } });
qrCode.append(document.getElementById("qr"));
```

The package ships an ES module build (`import`), a CommonJS/UMD build (`require` and `<script>`) and TypeScript
types for every option.

### React and Vue

The core stays framework-free. Thin wrappers (about 2 KB each) ship in the same package; React and Vue are
optional peer dependencies.

```jsx
import { useRef } from "react";
import { QRCode } from "qr-code-styling-node/react";

function Poster() {
  const qr = useRef();
  return (
    <>
      <QRCode ref={qr} options={{ data: "https://example.com", dotsOptions: { type: "fluid" } }} />
      <button onClick={() => qr.current.download({ extension: "png" })}>Download</button>
    </>
  );
}
```

```vue
<script setup>
import { ref } from "vue";
import { QRCode } from "qr-code-styling-node/vue";

const qr = ref();
const options = ref({ data: "https://example.com", shape: "circle" });
</script>

<template>
  <QRCode ref="qr" :options="options" @update="(qrCode) => console.log('drawn', qrCode)" />
  <button @click="qr.share({ name: 'qr' })">Share</button>
</template>
```

Both redraw only when the options really change: a new but equal object does not redraw. The React ref is the
`QRCodeStyling` instance (with an `onUpdate` prop called after each draw); the Vue ref exposes `qrCode`,
`download`, `share` and `getRawData`, and the component emits `update`.

### On Node.js

SVG works with no extra packages. `getRawData` returns a `Buffer` on Node.

```js
const QRCodeStyling = require("qr-code-styling-node");
const fs = require("fs");

const qrCode = new QRCodeStyling({
  type: "svg",
  data: "https://example.com",
  image: "https://example.com/logo.png", // data URLs and http(s) URLs work (remote images use fetch)
  dotsOptions: { type: "rounded", color: "#4267b2" },
  imageOptions: { saveAsBlob: true, margin: 8 } // embeds the logo inside the SVG
});

qrCode.getRawData("svg").then((buffer) => fs.writeFileSync("qr.svg", buffer));
```

For PNG, pick one of two optional packages (neither is a dependency of this library):

- **`@resvg/resvg-js`**: prebuilt binaries, nothing to compile. PNG only.

  ```js
  const { Resvg } = require("@resvg/resvg-js");
  const png = await new QRCodeStyling({ data: "https://example.com", resvg: Resvg }).getRawData("png");
  ```

- **`canvas`** (node-canvas): PNG, JPEG and WebP. Needed for QR art on a server.

  ```js
  const nodeCanvas = require("canvas");
  const png = await new QRCodeStyling({ data: "https://example.com", nodeCanvas }).getRawData("png");
  ```

The 1.5.0 way with `jsdom` still works. `jsdom` is no longer needed for SVG, which is about 6x faster without it.

## Guides

### Dots and corners

<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/dot_examples.png" width="720" />

`dotsOptions.type` sets the module style:

Group      |Types
-----------|----------------------------------------------------------------------------------------
Classic    |`square` (default), `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`
Geometric  |`diamond`, `small-square`, `vertical-lines`, `horizontal-lines`
Connected  |`fluid` (soft strokes), `wave` (rows of soft beads), `blob` (hand-drawn), `circuit` (pads and traces)

The finders (the three big squares) use `cornersSquareOptions.type` (`square`, `dot`, `extra-rounded`, `rounded`)
and `cornersDotOptions.type` (`square`, `dot`, `rounded`). When you don't set them, the finders are drawn with the
dot style. With the geometric and connected types they are drawn solid instead (rounded for connected types), so
the code keeps scanning.

Every part takes a `color` or a `gradient`:

```js
new QRCodeStyling({
  data: "https://example.com",
  dotsOptions: {
    type: "fluid",
    gradient: { type: "linear", rotation: Math.PI / 4, colorStops: [{ offset: 0, color: "#1d4ed8" }, { offset: 1, color: "#db2777" }] }
  },
  cornersSquareOptions: { type: "rounded", color: "#1d4ed8" },
  cornersDotOptions: { type: "rounded", color: "#db2777" },
  backgroundOptions: { color: "#ffffff" }
});
```

### Frames and labels

<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/style_examples.png" width="720" />

```js
new QRCodeStyling({
  data: "https://example.com",
  dotsOptions: { type: "rounded", color: "#1d4ed8" },
  frameOptions: { color: "#1d4ed8", radius: 24 },
  labelOptions: { text: "QUÉT ĐỂ MUA" }, // any Unicode text
  image: "https://example.com/logo.svg",
  imageOptions: { backgroundColor: "#ffffff", backgroundRadius: 0.5 } // a plate behind the logo
});
```

The frame and label are drawn inside `width` x `height`, and the code shrinks to fit.

### Round codes

<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/circle_examples.png" width="720" />

`shape: "circle"` draws a round code. The real code stays square in the middle, with an empty ring around it so
scanners still find it. The rest of the circle is filled with decorative dots in the same style, and the
background becomes a circle. The decoration is the same every time for the same data.

```js
new QRCodeStyling({ data: "https://example.com", shape: "circle", dotsOptions: { type: "rounded" } });
```

A round code has smaller modules than a square one of the same size: keep it at least about 240 px for short data,
and check it with `verify()`.

### QR art

<img src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/art_examples.png" width="720" />

`art` blends a picture into the code. There are three modes:

- **`halftone`** (default): the picture is redrawn as fine pixels, with each module kept in the middle.
  Use `colored: true` to keep the picture's colors.
- **`colorize`**: dots keep their shape (any dot type) and are painted with a darkened copy of the picture, over a
  light copy of it.
- **`blend`**: the picture fills the whole image like an illustration. Dots are drawn only where the picture is
  not already dark or light enough for the code. Finders take a dark color from the picture and sit on a light
  plate. Use `placement` to put the code in one part of a larger picture.

```js
// A poster with the code in the bottom right corner
new QRCodeStyling({
  width: 760,
  height: 300,
  data: "https://example.com",
  dotsOptions: { type: "dots" }, // round dots give round finders
  art: { image: "poster.jpg", mode: "blend", placement: { x: 510, y: 40, size: 220 } }
});

// A photo inside the code
new QRCodeStyling({
  data: "https://example.com",
  qrOptions: { errorCorrectionLevel: "H" }, // recommended for art
  art: { image: "https://example.com/photo.jpg", colored: true },
  imageOptions: { crossOrigin: "anonymous" } // the picture must be readable by a canvas
});
```

QR art reads the picture's pixels, so it needs a canvas. It works as is in the browser, and on Node it needs
`nodeCanvas`. Pictures from another origin need CORS (`crossOrigin`). Always check art with
`verify({ decoder, adjust: true })`: pictures with large mid-grey areas, or modules under about 7 px, may need more
`contrast`, a larger size or a higher error correction level.

### Wi-Fi, contacts, events and more

`payload` (also `QRCodeStyling.payload` for `<script>` users) builds the text that phone cameras understand.
Pass the result as `data`.

```js
import { payload } from "qr-code-styling-node";

payload.wifi({ ssid: "LongChau-Guest", password: "secret" }); // WIFI:T:WPA;S:LongChau-Guest;P:secret;;
payload.vCard({ firstName: "Quân", lastName: "Nguyễn", phone: "+84900000000", email: "a@example.com" });
payload.event({ title: "Khai trương", start: "2026-12-01T09:00:00+07:00", end: "2026-12-01T11:00:00+07:00" });
payload.email({ to: "cskh@example.com", subject: "Hỏi đáp" });
payload.phone("1800 6928");
payload.sms({ number: "+84900000000", message: "Xin chào" });
payload.geo({ latitude: 10.7769, longitude: 106.7009 });
```

Special characters are escaped as each format requires. Text with characters outside Latin-1 (Vietnamese,
emoji, CJK) is encoded as UTF-8, which is what scanners expect.

### Download and share

```js
qrCode.download({ name: "qr", extension: "svg" }); // png, jpeg, webp or svg

// On phones: opens the share sheet with the code as an image file.
// Where sharing files is not supported, it downloads the file instead.
const result = await qrCode.share({ name: "wifi", extension: "png", title: "Wi-Fi Long Châu" });
// "shared", "cancelled" or "downloaded"

const blob = await qrCode.getRawData("png"); // Blob in the browser, Buffer on Node
```

### Checking that a code scans

`verify()` renders the code and decodes it with a decoder you pass in, so the library itself stays
dependency-free. Any decoder with the [jsQR](https://www.npmjs.com/package/jsqr) signature works.

```js
import jsQR from "jsqr";

await qrCode.verify({ decoder: jsQR });
// { readable: true, decoded: "https://example.com", attempts: 1 }

// For QR art: raise art.contrast step by step until the code scans, and keep that setting.
await qrCode.verify({ decoder: jsQR, adjust: true });
// { readable: true, decoded: "...", contrast: 0.8, attempts: 3 }
```

On Node, `verify()` needs `nodeCanvas` or `resvg` to draw the code. A decoder succeeding is a good sign, not a
guarantee: phone cameras are usually more forgiving than jsQR, but print size, light and glare matter too.

### Smaller SVG files

`svgOptions: { mergePaths: true }` draws all dots as one `<path>` instead of one element per module. The picture
is the same, and files are 12-59% smaller depending on the dot type. This helps when a page shows many codes.

```js
new QRCodeStyling({ type: "svg", data: "https://example.com", svgOptions: { mergePaths: true } });
```

### Plugins

A plugin is a plain object with two optional hooks:

- `configure(options)` returns option changes, which are merged in before drawing.
- `afterDraw(draw)` draws on top of the finished code, with the canvas context or the SVG element. It gets the
  code's area in pixels (`x`, `y`, `size`, `dotSize`, `count`), and that area accounts for frames.

```js
const ring = {
  name: "ring",
  configure: (options) => (options.margin < 24 ? { margin: 24 } : undefined),
  afterDraw: ({ type, area, context, svg, document }) => {
    const cx = area.x + area.size / 2;
    const cy = area.y + area.size / 2;
    const r = area.size * 0.75;
    if (type === "canvas") {
      context.beginPath();
      context.arc(cx, cy, r, 0, Math.PI * 2);
      context.strokeStyle = "#e11d48";
      context.stroke();
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      Object.entries({ cx, cy, r, fill: "none", stroke: "#e11d48" }).forEach(([k, v]) => circle.setAttribute(k, v));
      svg.appendChild(circle);
    }
  }
};

new QRCodeStyling({ data: "https://example.com", plugins: [ring] });
```

Plugins run in order, and async `afterDraw` hooks are awaited. `configure` runs again on every `update()`, so it
should return the same changes for the same options. Check the result with `verify()` when a plugin draws near
the code.

## API reference

### `new QRCodeStyling(options)`

`options`

Property            |Type                                  |Default   |Description
--------------------|--------------------------------------|----------|-----------------------------------------------------------
data                |string                                |          |The text to encode
width               |number                                |`300`     |Width of the output in px
height              |number                                |`300`     |Height of the output in px
type                |`'canvas'` \| `'svg'`                 |`'canvas'`|Element to render
margin              |number                                |`0`       |Space around the code in px
shape               |`'square'` \| `'circle'`              |`'square'`|`'circle'` draws a round code, see [round codes](#round-codes)
qrOptions           |object                                |          |Encoding options, see below
image               |string                                |          |Logo in the middle (URL or data URL)
imageOptions        |object                                |          |Logo options, see below
dotsOptions         |object                                |          |Module style, see below
cornersSquareOptions|object                                |          |Finder ring style, see below
cornersDotOptions   |object                                |          |Finder center style, see below
backgroundOptions   |object                                |          |Background, see below
frameOptions        |object                                |          |Border around the code, see below
labelOptions        |object                                |          |Text above or below the code, see below
art                 |object                                |          |QR art, see below
svgOptions          |`{ mergePaths?: boolean }`            |          |SVG only: `mergePaths: true` draws all dots as one path
plugins             |array                                 |          |See [plugins](#plugins)
nodeCanvas          |`canvas` module                       |          |Node only. Canvas output (png, jpeg, webp) and QR art on a server
resvg               |`Resvg` from `@resvg/resvg-js`        |          |Node only. PNG without node-canvas
jsdom               |`JSDOM` from `jsdom`                  |          |Node only. Not needed any more; accepted for backward compatibility

`qrOptions`

Property            |Type                                              |Default
--------------------|--------------------------------------------------|-------
typeNumber          |number (`0`-`40`, `0` = smallest that fits)       |`0`
mode                |`'Numeric'` \| `'Alphanumeric'` \| `'Byte'` \| `'Kanji'`|picked from the data
errorCorrectionLevel|`'L'` \| `'M'` \| `'Q'` \| `'H'`                  |`'Q'`

`imageOptions`

Property          |Type                                 |Default|Description
------------------|-------------------------------------|-------|-------------------------------------------------------------
imageSize         |number                               |`0.4`  |Size of the logo relative to the code. Keep it at 0.5 or less
margin            |number                               |`0`    |Space around the logo in px
hideBackgroundDots|boolean                              |`true` |Hide the dots behind the logo
crossOrigin       |`'anonymous'` \| `'use-credentials'` |       |Needed for logos from another origin
saveAsBlob        |boolean                              |`false`|SVG: embed the logo instead of linking it. Renders in more apps, larger file
backgroundColor   |string                               |       |Draws a plate of this color behind the logo
backgroundRadius  |number (`0`-`0.5`)                   |`0.2`  |Corner radius of the plate, relative to its size. `0.5` is round

`dotsOptions`

Property|Type  |Default   |Description
--------|------|----------|------------------------------------------------------------------
type    |string|`'square'`|See [dots and corners](#dots-and-corners) for the 14 types
color   |string|`'#000'`  |Dot color
gradient|object|          |Dot gradient, see below

`cornersSquareOptions` and `cornersDotOptions`

Property|Type  |Description
--------|------|------------------------------------------------------------------------------------------
type    |string|Squares: `'square'` `'dot'` `'extra-rounded'` `'rounded'`. Centers: `'square'` `'dot'` `'rounded'`
color   |string|Color. Defaults to the dots color
gradient|object|Gradient, see below

`backgroundOptions`

Property|Type  |Default
--------|------|-------
color   |string|`'#fff'`
gradient|object|

Gradients (`dotsOptions.gradient`, `backgroundOptions.gradient`, `cornersSquareOptions.gradient`, `cornersDotOptions.gradient`)

Property  |Type                       |Default   |Description
----------|---------------------------|----------|-----------------------------------------------------
type      |`'linear'` \| `'radial'`   |`'linear'`|Type of gradient
rotation  |number                     |`0`       |Rotation in radians (`Math.PI` is 180 degrees)
colorStops|`{ offset, color }[]`      |          |`offset` from 0 to 1, e.g. `[{ offset: 0, color: "blue" }, { offset: 1, color: "red" }]`

`frameOptions`

Property|Type  |Default       |Description
--------|------|--------------|--------------------------------------------
color   |string|`'#000'`      |Frame and label band color
width   |number|4% of the size|Border thickness in px
radius  |number|`0`           |Outer corner radius in px
padding |number|4% of the size|Space between the frame and the code in px

`labelOptions`

Property  |Type                    |Default                               |Description
----------|------------------------|--------------------------------------|-------------------
text      |string                  |                                      |The text. Required
position  |`'top'` \| `'bottom'`   |`'bottom'`                            |Where the label goes
color     |string                  |white on a frame, else the dots color |Text color
fontSize  |number                  |7% of the size                        |In px
fontFamily|string                  |`'Helvetica, Arial, sans-serif'`      |
fontWeight|string \| number        |`'bold'`                              |

`art`

Property   |Type                                       |Default                                   |Description
-----------|-------------------------------------------|------------------------------------------|-------------------------------------------------------
image      |string                                     |                                          |The picture (URL or data URL). Required
mode       |`'halftone'` \| `'colorize'` \| `'blend'`  |`'halftone'`                              |How the picture is blended in
contrast   |number (`0`-`1`)                           |`0.5` halftone, `0.7` colorize, `0.6` blend|Higher is easier to scan but shows less of the picture
colored    |boolean                                    |`false`                                   |halftone: use the picture's colors
background |boolean                                    |`true`                                    |colorize: show a light copy of the picture behind the dots
placement  |`{ x, y, size }`                           |                                          |Put the code in this square (px) instead of the middle
crossOrigin|string                                     |                                          |Overrides `imageOptions.crossOrigin` for the picture

### Methods

Method                                         |Returns                                       |Description
-----------------------------------------------|----------------------------------------------|----------------------------------------------
`append(container)`                            |`void`                                        |Puts the canvas or SVG into a DOM element
`update(options)`                              |`void`                                        |Redraws with changed options (merged into the current ones)
`getRawData(extension = 'png')`                |`Promise<Blob \| Buffer>`                     |`'png'` `'jpeg'` `'webp'` `'svg'`. Blob in the browser, Buffer on Node
`download({ name = 'qr', extension = 'png' })` |`Promise<void>`                               |Saves the file in the browser
`share({ name, extension, title, text })`      |`Promise<'shared' \| 'cancelled' \| 'downloaded'>`|Share sheet on phones, download elsewhere
`verify({ decoder, adjust })`                  |`Promise<{ readable, decoded, contrast, attempts }>`|Decodes the result, see [checking](#checking-that-a-code-scans)

### Named exports

`payload` (data builders), `dotTypes`, `cornerSquareTypes`, `cornerDotTypes`, `errorCorrectionLevels`,
`errorCorrectionPercents`, `modes`, `qrTypes`, `drawTypes`, and TypeScript types such as `Options`, `QRPlugin`,
`WifiOptions`, `VCardOptions` and `EventOptions`.

## Upgrading from 1.5.0

Nothing to change: the same options draw the same picture, and every 1.5.0 entry point still works, including
`require("qr-code-styling-node/lib/qr-code-styling.common.js")`. A test suite compares the output with 1.5.0
pixel by pixel. Things you can now drop or use:

- **`jsdom` is no longer needed** for SVG on Node, and SVG is about 6x faster without it.
- **`resvg`** gives PNG on a server without the native `canvas` package.
- **Vietnamese and other non-Latin-1 text** is now encoded as UTF-8. 1.5.0 kept only one byte per character, so
  such codes scanned as garbled text. Codes for Latin-1 text are unchanged.

## Development

```
npm install
npm test          # unit, compatibility and scan tests (vitest)
npm run lint      # eslint + prettier
npm run build     # lib/: UMD, CommonJS, ES module, React and Vue wrappers, types
npm run playground # builds the playground into site/
npm start         # dev server
```

`npm run art-examples`, `blend-examples`, `circle-examples`, `dot-examples` and `style-examples` regenerate the
images in this README.

## License

[MIT License](LICENSE). Copyright (c) 2019 Denys Kozak (original qr-code-styling) and qr-code-styling-node contributors.
