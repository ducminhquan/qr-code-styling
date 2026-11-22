# QR Code Styling (Node)
[![npm](https://img.shields.io/npm/v/qr-code-styling-node.svg)](https://www.npmjs.com/package/qr-code-styling-node)
[![CI](https://github.com/ducminhquan/qr-code-styling/actions/workflows/ci.yml/badge.svg)](https://github.com/ducminhquan/qr-code-styling/actions/workflows/ci.yml)

JavaScript library for generating styled QR codes with a logo: custom dots, corners, gradients and backgrounds.
Works in the browser (canvas or SVG) and on Node.js servers, with a single dependency and one options object.

`qr-code-styling-node` is an independently maintained project. It started as a fork of
[qr-code-styling](https://github.com/kozakdenys/qr-code-styling) by Denys Kozak and keeps its API,
so code written for either package keeps working. See [CHANGELOG.md](CHANGELOG.md) for what changed.

Found a bug or have an idea? [Open an issue](https://github.com/ducminhquan/qr-code-styling/issues).
### Examples
<p float="left">
<img style="display:inline-block" src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/facebook_example_new.png" width="240" />
<img style="display:inline-block" src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/qr_code_example.png" width="240" />
<img style="display:inline-block" src="https://raw.githubusercontent.com/ducminhquan/qr-code-styling/master/src/assets/telegram_example_new.png" width="240" />
</p>

### Installation

```
npm install qr-code-styling-node
```

### Usage

```HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>QR Code Styling</title>
    <script type="text/javascript" src="https://unpkg.com/qr-code-styling-node@1.7.0/lib/qr-code-styling.js"></script>
</head>
<body>
<div id="canvas"></div>
<script type="text/javascript">

    const qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: "https://www.facebook.com/",
        image: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
        dotsOptions: {
            color: "#4267b2",
            type: "rounded"
        },
        backgroundOptions: {
            color: "#e9ebee",
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 20
        }
    });

    qrCode.append(document.getElementById("canvas"));
    qrCode.download({ name: "qr", extension: "svg" });
</script>
</body>
</html>
```
---

### Using with a bundler or TypeScript

```js
import QRCodeStyling, { dotTypes } from "qr-code-styling-node";

const qrCode = new QRCodeStyling({ data: "https://example.com", dotsOptions: { type: dotTypes.rounded } });
qrCode.append(document.getElementById("canvas"));
```

The package ships an ES module build (`import`), a CommonJS/UMD build (`require` and `<script>`) and TypeScript types.

---

### API Documentation

#### QRCodeStyling instance
`new QRCodeStyling(options) => QRCodeStyling`

Param  |Type  |Description
-------|------|------------
options|object|Init object

`options` structure

Property               |Type                     |Default Value|Description
-----------------------|-------------------------|-------------|-----------------------------------------------------
width                  |number                   |`300`        |Size of canvas
height                 |number                   |`300`        |Size of canvas
type                   |string (`'canvas' 'svg'`)|`canvas`     |The type of the element that will be rendered
data                   |string                   |             |The date will be encoded to the QR code
image                  |string                   |             |The image will be copied to the center of the QR code
margin                 |number                   |`0`          |Margin around canvas
qrOptions              |object                   |             |Options will be passed to `qrcode-generator` lib
imageOptions           |object                   |             |Specific image options, details see below
dotsOptions            |object                   |             |Dots styling options
cornersSquareOptions   |object                   |             |Square in the corners styling options
cornersDotOptionsHelper|object                   |             |Dots in the corners styling options
backgroundOptions      |object                   |             |QR background styling options
nodeCanvas             |node-canvas              |             |Node only, optional. Needed for canvas output (png, jpeg, webp) on a server, see the Node section below
jsdom                  |jsdom                    |             |Node only, optional. Not needed for svg any more; still accepted for backward compatibility
resvg                  |`Resvg` from `@resvg/resvg-js`|        |Node only, optional. Produces png without node-canvas, see the Node section below

`options.qrOptions` structure

Property            |Type                                              |Default Value
--------------------|--------------------------------------------------|-------------
typeNumber          |number (`0 - 40`)                                 |`0`
mode                |string (`'Numeric' 'Alphanumeric' 'Byte' 'Kanji'`)|
errorCorrectionLevel|string (`'L' 'M' 'Q' 'H'`)                        |`'Q'`

`options.imageOptions` structure

Property          |Type                                   |Default Value|Description
------------------|---------------------------------------|-------------|------------------------------------------------------------------------------
hideBackgroundDots|boolean                                |`true`       |Hide all dots covered by the image
imageSize         |number                                 |`0.4`        |Coefficient of the image size. Not recommended to use ove 0.5. Lower is better
margin            |number                                 |`0`          |Margin of the image in px
crossOrigin       |string(`'anonymous' 'use-credentials'`)|             |Set "anonymous" if you want to download QR code from other origins.
saveAsBlob        |boolean                                |`false`      |Saves image as base64 blob in svg type, see bellow

When QR type is svg, the image may not load in certain applications as it is saved as a url, and some svg applications will not render url images for security reasons. Setting `saveAsBlob` to true will instead save the image as a blob, allowing it to render correctly in more places, but will also increase the file size.

`options.dotsOptions` structure

Property|Type                                                                          |Default Value|Description
--------|------------------------------------------------------------------------------|-------------|-------------------
color   |string                                                                        |`'#000'`     |Color of QR dots
gradient|object                                                                        |             |Gradient of QR dots
type    |string (`'rounded' 'dots' 'classy' 'classy-rounded' 'square' 'extra-rounded'`)|`'square'`   |Style of QR dots

`options.backgroundOptions` structure

Property|Type  |Default Value
--------|------|-------------
color   |string|`'#fff'`
gradient|object|

`options.cornersSquareOptions` structure

Property|Type                                     |Default Value|Description
--------|-----------------------------------------|-------------|-----------------
color   |string                                   |             |Color of Corners Square
gradient|object                                   |             |Gradient of Corners Square
type    |string (`'dot' 'square' 'extra-rounded'`)|             |Style of Corners Square

`options.cornersDotOptions` structure

Property|Type                     |Default Value|Description
--------|-------------------------|-------------|-----------------
color   |string                   |             |Color of Corners Dot
gradient|object                   |             |Gradient of Corners Dot
type    |string (`'dot' 'square'`)|             |Style of Corners Dot

Gradient structure

`options.dotsOptions.gradient`

`options.backgroundOptions.gradient`

`options.cornersSquareOptions.gradient`

`options.cornersDotOptions.gradient`

Property  |Type                        |Default Value|Description
----------|----------------------------|-------------|---------------------------------------------------------
type      |string (`'linear' 'radial'`)|"linear"     |Type of gradient spread
rotation  |number                      |0            |Rotation of gradient in radians (Math.PI === 180 degrees)
colorStops|array of objects            |             |Gradient colors. Example `[{ offset: 0, color: 'blue' }, {  offset: 1, color: 'red' }]`

Gradient colorStops structure

`options.dotsOptions.gradient.colorStops[]`

`options.backgroundOptions.gradient.colorStops[]`

`options.cornersSquareOptions.gradient.colorStops[]`

`options.cornersDotOptions.gradient.colorStops[]`

Property|Type            |Default Value|Description
--------|----------------|-------------|-----------------------------------
offset  |number (`0 - 1`)|             |Position of color in gradient range
color   |string          |             |Color of stop in gradient range

#### QRCodeStyling methods
`QRCodeStyling.append(container) => void`

Param    |Type       |Description
---------|-----------|-----------
container|DOM element|This container will be used for appending of the QR code

`QRCodeStyling.getRawData(extension) => Promise<Blob>`

Param    |Type                                |Default Value|Description
---------|------------------------------------|-------------|------------
extension|string (`'png' 'jpeg' 'webp' 'svg'`)|`'png'`      |Blob type on browser, Buffer type on Node

`QRCodeStyling.update(options) => void`

Param  |Type  |Description
-------|------|--------------------------------------
options|object|The same options as for initialization

`QRCodeStyling.download(downloadOptions) => Promise<void>`

Param          |Type  |Description
---------------|------|------------
downloadOptions|object|Options with extension and name of file (not required)

Promise returned will resolve into the data URI of the QR code image.

`downloadOptions` structure

Property |Type                                |Default Value|Description
---------|------------------------------------|-------------|-----------------------------------------------------
name     |string                              |`'qr'`       |Name of the downloaded file
extension|string (`'png' 'jpeg' 'webp' 'svg'`)|`'png'`      |File extension

### Node Support

#### SVG with no extra packages

On Node.js, SVG output works out of the box: no `jsdom` and no `canvas` are needed, and it is about
6 times faster than going through jsdom. `getRawData` returns a Buffer on Node (a Blob where `Buffer` does not exist).
Other runtimes without a DOM should work the same way, but only Node.js is tested.

```js
const QRCodeStyling = require("qr-code-styling-node");
const fs = require("fs");

const qrCode = new QRCodeStyling({
    type: "svg",
    data: "https://example.com",
    image: "https://example.com/logo.png", // data URLs and http(s) URLs work; remote images use fetch
    dotsOptions: { color: "#4267b2", type: "rounded" },
    imageOptions: { saveAsBlob: true, margin: 8 } // saveAsBlob embeds the logo inside the SVG
});

qrCode.getRawData("svg").then((buffer) => fs.writeFileSync("qr.svg", buffer));
```

#### PNG without node-canvas

`node-canvas` needs native system libraries. If you only need png, install `@resvg/resvg-js` instead
(prebuilt binaries, nothing to compile) and pass its `Resvg` class:

```js
const QRCodeStyling = require("qr-code-styling-node");
const { Resvg } = require("@resvg/resvg-js");
const fs = require("fs");

const qrCode = new QRCodeStyling({ data: "https://example.com", resvg: Resvg });
qrCode.getRawData("png").then((buffer) => fs.writeFileSync("qr.png", buffer));
```

#### With node-canvas (png, jpeg, webp) and jsdom

This is the original 1.5.0 way and keeps working unchanged.
Pass the node-canvas module for canvas output. Passing `jsdom` for svg is optional now.
You must pass both if using `imageOptions.saveAsBlob` with jsdom.

`canvas` and `jsdom` are not dependencies of this package; install the ones you need (`npm install canvas jsdom`).

```js
const QRCodeStyling = require("qr-code-styling-node");
// The 1.5.0 style import keeps working too:
// const { QRCodeStyling } = require("qr-code-styling-node/lib/qr-code-styling.common.js");
const nodeCanvas = require("canvas");
const { JSDOM } = require("jsdom");
const fs = require("fs");

const options = {
    width: 300,
    height: 300,
    data: "https://www.facebook.com/",
    image: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
    dotsOptions: {
        color: "#4267b2",
        type: "rounded"
    },
    backgroundOptions: {
        color: "#e9ebee",
    },
    imageOptions: {
        crossOrigin: "anonymous",
        margin: 20
    }
}

// For canvas type
const qrCodeImage = new QRCodeStyling({
    nodeCanvas, // this is required
    ...options
});

qrCodeImage.getRawData("png").then((buffer) => {
  fs.writeFileSync("test.png", buffer);
});

// For svg type
const qrCodeSvg = new QRCodeStyling({
    jsdom: JSDOM, // this is required
    type: "svg",
    ...options
});

qrCodeSvg.getRawData("svg").then((buffer) => {
  fs.writeFileSync("test.svg", buffer);
});

// For svg type with the inner-image saved as a blob
// (inner-image will render in more places but file will be larger)
const qrCodeSvgWithBlobImage = new QRCodeStyling({
    jsdom: JSDOM, // this is required
    nodeCanvas, // this is required
    type: "svg",
    ...options,
    imageOptions: {
        saveAsBlob: true,
        crossOrigin: "anonymous",
        margin: 20
    }
});

qrCodeSvgWithBlobImage.getRawData("svg").then((buffer) => {
  fs.writeFileSync("test_blob.svg", buffer);
});

```

### License

[MIT License](LICENSE). Copyright (c) 2019 Denys Kozak (original qr-code-styling) and qr-code-styling-node contributors.

