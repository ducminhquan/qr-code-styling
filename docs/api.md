# API reference

Every option, method and export of `qr-code-styling-node`. For examples see the [guides](guides.md).

## `new QRCodeStyling(options)`

`options`

Property            |Type                                  |Default   |Description
--------------------|--------------------------------------|----------|-----------------------------------------------------------
data                |string                                |          |The text to encode
width               |number                                |`300`     |Width of the output in px
height              |number                                |`300`     |Height of the output in px
type                |`'canvas'` \| `'svg'`                 |`'canvas'`|Element to render
margin              |number                                |`0`       |Space around the code in px
shape               |`'square'` \| `'circle'` \| `'heart'` \| `'hexagon'` \| `'octagon'` \| `'diamond'`|`'square'`|A shaped code, see [round codes and other shapes](guides.md#round-codes-and-other-shapes)
qrOptions           |object                                |          |Encoding options, see below
image               |string                                |          |Logo in the middle (URL or data URL)
imageOptions        |object                                |          |Logo options, see below
dotsOptions         |object                                |          |Module style, see below
cornersSquareOptions|object                                |          |Finder ring style, see below
cornersDotOptions   |object                                |          |Finder center style, see below
backgroundOptions   |object                                |          |Background, see below
frameOptions        |object                                |          |Border around the code, see below
labelOptions        |object \| object[]                    |          |Text above and/or below the code, see below
art                 |object                                |          |QR art, see below
svgOptions          |`{ mergePaths?: boolean }`            |          |SVG only: `mergePaths: true` draws all dots as one path
idPrefix            |string                                |          |SVG only: put in front of every id in the SVG, for several `getRawData("svg")` strings in one page. Codes shown with `append()` get unique ids by themselves
title               |string                                |          |Accessible name for screen readers, see [accessibility](guides.md#accessibility)
plugins             |array                                 |          |See [plugins](guides.md#plugins)
nodeCanvas          |`canvas` module                       |          |Node only. Canvas output (png, jpeg, webp) and QR art on a server
resvg               |`Resvg` from `@resvg/resvg-js`        |          |Node only. PNG without node-canvas
jsdom               |`JSDOM` from `jsdom`                  |          |Node only. Not needed any more; accepted for backward compatibility

`qrOptions`

Property            |Type                                              |Default
--------------------|--------------------------------------------------|-------
typeNumber          |number (`0`-`40`, `0` = smallest that fits)       |`0`
mode                |`'Numeric'` \| `'Alphanumeric'` \| `'Byte'` \| `'Kanji'`|picked from the data
errorCorrectionLevel|`'L'` \| `'M'` \| `'Q'` \| `'H'`                  |`'Q'`
encoding            |`'utf-8'` \| `'latin1'`                           |`'utf-8'`: text with accents is UTF-8. `'latin1'` writes Latin-1 text one byte per character, as 1.x did

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
type    |string|`'square'`|See [dots and corners](guides.md#dots-and-corners) for the 14 types
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
text      |string                  |                                      |The text; `"\n"` starts a new line
lines     |`{ text, fontSize, fontWeight, color, fontFamily }[]`|      |Lines with their own style, instead of `text`
position  |`'top'` \| `'bottom'`   |`'bottom'`                            |Where the label goes
color     |string                  |white on a frame band, else the dots color|Text color
fontSize  |number                  |7% of the size                        |In px
fontFamily|string                  |`'Helvetica, Arial, sans-serif'`      |
fontWeight|string \| number        |`'bold'`                              |
background|string                  |the frame color with a frame, else none|Band color, or `'none'`

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

## Methods

Method                                         |Returns                                       |Description
-----------------------------------------------|----------------------------------------------|----------------------------------------------
`append(container)`                            |`void`                                        |Puts the canvas or SVG into a DOM element
`update(options)`                              |`void`                                        |Redraws with changed options (merged into the current ones)
`getRawData(extension = 'png')`                |`Promise<Blob \| Buffer>`                     |`'png'` `'jpeg'` `'webp'` `'svg'`. Blob in the browser, Buffer on Node
`getSVGString()`                               |`Promise<string>`                             |The SVG markup without the XML declaration, ready to inline in HTML
`download({ name = 'qr', extension = 'png' })` |`Promise<void>`                               |Saves the file in the browser
`share({ name, extension, title, text })`      |`Promise<'shared' \| 'cancelled' \| 'downloaded'>`|Share sheet on phones, download elsewhere
`verify({ decoder, adjust })`                  |`Promise<{ readable, decoded, contrast, attempts }>`|Decodes the result, see [checking](guides.md#checking-that-a-code-scans)
`check({ printWidthMm, scanDistanceMm })`      |`{ ok, issues, version, modules, moduleSize, contrast }`|Quick scan problems without decoding; also `QRCodeStyling.check(options)`

## Named exports

`payload` (data builders), `dotTypes`, `cornerSquareTypes`, `cornerDotTypes`, `errorCorrectionLevels`,
`errorCorrectionPercents`, `modes`, `qrTypes`, `drawTypes`, and TypeScript types such as `Options`, `QRPlugin`,
`WifiOptions`, `VCardOptions`, `EventOptions`, `VietQROptions`, `GS1Options` and `CheckResult`.

Also `templates` (`templates.vietQR`), `formatVND`, `vietQRBankNames` and the types `VietQRCardOptions` and
`VietQRTheme`.

`qr-code-styling-node/print` exports `sheet`, `pdf`, `parseCSV`, `fillTemplate`, `pageSize` and `embedSVG`.
