import getMode from "../tools/getMode";
import mergeDeep from "../tools/merge";
import downloadURI from "../tools/downloadURI";
import QRCanvas from "./QRCanvas";
import QRSVG from "./QRSVG";
import drawTypes from "../constants/drawTypes";

import defaultOptions, { RequiredOptions } from "./QROptions";
import sanitizeOptions from "../tools/sanitizeOptions";
import { Extension, QRCode, Options, DownloadOptions, VerifyOptions, VerifyResult, ShareOptions } from "../types";
import { getContrast } from "../art/art";
import qrcode from "qrcode-generator";
import toUTF8Bytes, { needsUTF8 } from "../tools/utf8";
import payload from "../tools/payloads";
import templates from "../templates";
import { configurePlugins } from "../tools/plugins";
import { hasBrowserDom } from "../tools/svgDom";
import checkQR, { CheckOptions, CheckResult } from "../tools/check";

export default class QRCodeStyling {
  /** Builders for Wi-Fi, contact, event, e-mail, phone, SMS and location codes: pass the result as `data`. */
  static payload = payload;
  /** Ready-made designs, e.g. templates.vietQR({ bank, account, amount, accountName }): pass the result as options. */
  static templates = templates;

  _options: RequiredOptions;
  _container?: HTMLElement;
  _canvas?: QRCanvas;
  _svg?: QRSVG;
  _qr?: QRCode;
  _canvasDrawingPromise?: Promise<void>;
  _svgDrawingPromise?: Promise<void>;

  constructor(options?: Partial<Options>) {
    this._options = options
      ? configurePlugins(sanitizeOptions(mergeDeep(defaultOptions, options) as RequiredOptions))
      : defaultOptions;
    this.update();
  }

  /** Canvas output needs a browser canvas or node-canvas. */
  _canUseCanvas(): boolean {
    return !!this._options.nodeCanvas?.createCanvas || hasBrowserDom();
  }

  static _clearContainer(container?: HTMLElement): void {
    if (container) {
      container.innerHTML = "";
    }
  }

  async _getQRStylingElement(extension: Extension = "png"): Promise<QRCanvas | QRSVG> {
    if (!this._qr) throw "QR code is empty";

    if (extension.toLowerCase() === "svg") {
      let promise, svg: QRSVG;

      if (this._svg && this._svgDrawingPromise) {
        svg = this._svg;
        promise = this._svgDrawingPromise;
      } else {
        svg = new QRSVG(this._options);
        promise = svg.drawQR(this._qr);
      }

      await promise;

      return svg;
    } else {
      if (!this._canUseCanvas()) {
        throw new Error(
          `Rendering "${extension}" outside the browser needs node-canvas (pass { nodeCanvas: require("canvas") }) ` +
            `or, for png, resvg (pass { resvg: require("@resvg/resvg-js").Resvg }). SVG output needs neither.`
        );
      }
      let promise, canvas: QRCanvas;

      if (this._canvas && this._canvasDrawingPromise) {
        canvas = this._canvas;
        promise = this._canvasDrawingPromise;
      } else {
        canvas = new QRCanvas(this._options);
        promise = canvas.drawQR(this._qr);
      }

      await promise;

      return canvas;
    }
  }

  update(options?: Partial<Options>): void {
    QRCodeStyling._clearContainer(this._container);
    this._options = options
      ? configurePlugins(sanitizeOptions(mergeDeep(this._options, options) as RequiredOptions))
      : this._options;

    if (!this._options.data) {
      return;
    }

    this._qr = QRCodeStyling._makeQR(this._options);

    if (this._options.type === drawTypes.canvas && !this._canUseCanvas()) {
      // No canvas available (server without node-canvas): draw lazily on getRawData().
      this._canvas = undefined;
      this._canvasDrawingPromise = undefined;
      this._svg = undefined;
      this._svgDrawingPromise = undefined;
    } else if (this._options.type === drawTypes.canvas) {
      this._canvas = new QRCanvas(this._options);
      this._canvasDrawingPromise = this._canvas.drawQR(this._qr);
      this._svgDrawingPromise = undefined;
      this._svg = undefined;
    } else {
      this._svg = new QRSVG(this._options);
      this._svgDrawingPromise = this._svg.drawQR(this._qr);
      this._canvasDrawingPromise = undefined;
      this._canvas = undefined;
    }

    this.append(this._container);
  }

  /** Encodes options.data into a QR matrix, without drawing anything. */
  static _makeQR(options: RequiredOptions): QRCode {
    const qr = qrcode(options.qrOptions.typeNumber, options.qrOptions.errorCorrectionLevel);
    const data = options.data;
    if (needsUTF8(data, options.qrOptions.encoding)) {
      // Non-ASCII text (accents, Vietnamese, emoji...) is encoded as UTF-8, which scanners expect.
      // qrOptions.encoding "latin1" keeps the 1.x one-byte-per-character encoding for Latin-1 text.
      const generator = qrcode as unknown as { stringToBytes: (text: string) => number[] };
      const latin1 = generator.stringToBytes;
      generator.stringToBytes = toUTF8Bytes;
      try {
        qr.addData(data, options.qrOptions.mode || getMode(data));
      } finally {
        generator.stringToBytes = latin1;
      }
    } else {
      qr.addData(data, options.qrOptions.mode || getMode(data));
    }
    qr.make();
    return qr as QRCode;
  }

  append(container?: HTMLElement): void {
    if (!container) {
      return;
    }

    if (typeof container.appendChild !== "function") {
      throw "Container should be a single DOM node";
    }

    if (this._options.type === drawTypes.canvas) {
      if (this._canvas) {
        container.appendChild(this._canvas.getCanvas());
      }
    } else {
      if (this._svg) {
        container.appendChild(this._svg.getElement());
      }
    }

    this._container = container;
  }

  static _serializeSVG(svg: QRSVG): string {
    const serializer = new svg._window.XMLSerializer();
    return `<?xml version="1.0" standalone="no"?>\r\n${serializer.serializeToString(svg.getElement())}`;
  }

  async _getSVGString(): Promise<{ svgString: string; svg: QRSVG }> {
    const svg = (await this._getQRStylingElement("svg")) as QRSVG;
    return { svgString: QRCodeStyling._serializeSVG(svg), svg };
  }

  /**
   * resvg follows the SVG spec more strictly than browsers: it does not accept quoted url('#id')
   * references, and it hides elements whose clip-path points to a missing id. Browsers ignore both,
   * so normalize them to get the picture a browser would show. The public SVG output is unchanged.
   */
  static _normalizeSVGForResvg(svgString: string): string {
    const ids = new Set<string>();
    svgString.replace(/\sid="([^"]+)"/g, (match, id: string) => {
      ids.add(id);
      return match;
    });

    return svgString
      .replace(/\sclip-path="url\('#([^']+)'\)"/g, (_match, id: string) =>
        ids.has(id) ? ` clip-path="url(#${id})"` : ""
      )
      .replace(/url\('#([^']+)'\)/g, "url(#$1)");
  }

  async _rasterizeWithResvg(extension: Extension): Promise<Buffer | Uint8Array> {
    const Resvg = this._options.resvg;
    if (!Resvg) throw new Error("resvg is not configured");
    if (extension.toLowerCase() !== "png") {
      throw new Error(`resvg can only produce png, not "${extension}". Use extension "png" or pass nodeCanvas.`);
    }
    // resvg cannot fetch remote images, so embed the logo in the SVG first.
    const previous = this._options.imageOptions.saveAsBlob;
    const previousSvg = this._svg;
    const previousPromise = this._svgDrawingPromise;
    let svgString: string;
    try {
      if (this._options.image && !previous && !this._options.image.startsWith("data:")) {
        this._options.imageOptions.saveAsBlob = true;
        this._svg = undefined;
        this._svgDrawingPromise = undefined;
      }
      ({ svgString } = await this._getSVGString());
    } finally {
      this._options.imageOptions.saveAsBlob = previous;
      this._svg = previousSvg;
      this._svgDrawingPromise = previousPromise;
    }
    const png = new Resvg(QRCodeStyling._normalizeSVGForResvg(svgString), { fitTo: { mode: "original" } })
      .render()
      .asPng();

    return typeof Buffer !== "undefined" ? Buffer.from(png) : png;
  }

  /** Draws the current QR code to RGBA pixels, using a canvas or, failing that, resvg. */
  async _getPixels(): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
    if (this._canUseCanvas()) {
      const canvas = ((await this._getQRStylingElement("png")) as QRCanvas).getCanvas();
      const context = canvas.getContext("2d") as CanvasRenderingContext2D;
      return {
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height
      };
    }
    if (this._options.resvg) {
      const { svgString } = await this._getSVGString();
      const rendered = new this._options.resvg(QRCodeStyling._normalizeSVGForResvg(svgString), {
        fitTo: { mode: "original" }
      }).render();
      return { data: new Uint8ClampedArray(rendered.pixels), width: rendered.width, height: rendered.height };
    }
    throw new Error(
      "verify() needs to draw the QR code: in a browser this works as is; on a server pass nodeCanvas or resvg."
    );
  }

  async _decode(decoder: VerifyOptions["decoder"]): Promise<string | undefined> {
    const { data, width, height } = await this._getPixels();
    // Surround the code with a white quiet zone, as a printed code would have.
    const pad = Math.max(16, Math.round(Math.min(width, height) / 8));
    const paddedWidth = width + pad * 2;
    const paddedHeight = height + pad * 2;
    const padded = new Uint8ClampedArray(paddedWidth * paddedHeight * 4).fill(255);
    for (let y = 0; y < height; y++) {
      padded.set(data.subarray(y * width * 4, (y + 1) * width * 4), ((y + pad) * paddedWidth + pad) * 4);
    }
    const result = decoder(padded, paddedWidth, paddedHeight, { inversionAttempts: "attemptBoth" });
    return result ? result.data : undefined;
  }

  /**
   * Checks that the QR code can be scanned by decoding the rendered picture.
   * With `adjust: true` and QR art, raises art.contrast step by step until it scans.
   */
  /**
   * Looks for the usual reasons a code does not scan (contrast, inverted colors, logo size, quiet zone,
   * module size, density) without drawing or decoding it. Synchronous and works everywhere.
   * Pass { printWidthMm } to also check the module size for print.
   */
  check(checkOptions?: CheckOptions): CheckResult {
    if (!this._qr) throw "QR code is empty";
    return checkQR(this._options, this._qr, checkOptions);
  }

  /** Same as `new QRCodeStyling(options).check(checkOptions)`. */
  static check(options: Partial<Options>, checkOptions?: CheckOptions): CheckResult {
    const merged = configurePlugins(sanitizeOptions(mergeDeep(defaultOptions, options) as RequiredOptions));
    if (!merged.data) throw "QR code is empty";
    return checkQR(merged, QRCodeStyling._makeQR(merged), checkOptions);
  }

  async verify({ decoder, adjust = false }: VerifyOptions): Promise<VerifyResult> {
    if (!this._qr) throw "QR code is empty";
    if (typeof decoder !== "function")
      throw new Error("verify() needs a decoder, for example jsQR from the jsqr package");

    let attempts = 1;
    let decoded = await this._decode(decoder);
    const art = this._options.art;

    if (decoded !== this._options.data && adjust && art) {
      const start = getContrast(art);
      for (const contrast of [0.65, 0.8, 0.9, 1].filter((value) => value > start)) {
        attempts++;
        this.update({ art: { ...art, contrast } });
        decoded = await this._decode(decoder);
        if (decoded === this._options.data) break;
      }
    }

    return {
      readable: decoded === this._options.data,
      decoded,
      contrast: this._options.art ? getContrast(this._options.art) : undefined,
      attempts
    };
  }

  async getRawData(extension: Extension = "png"): Promise<Blob | Buffer | null> {
    if (!this._qr) throw "QR code is empty";

    if (extension.toLowerCase() !== "svg" && !this._canUseCanvas() && this._options.resvg) {
      return (await this._rasterizeWithResvg(extension)) as Buffer;
    }

    const element = await this._getQRStylingElement(extension);

    if (extension.toLowerCase() === "svg" && (element as QRSVG)._virtual) {
      const svgString = QRCodeStyling._serializeSVG(element as QRSVG);
      return typeof Buffer !== "undefined"
        ? Buffer.from(svgString)
        : (new Blob([svgString], { type: "image/svg+xml" }) as Blob);
    }

    if (extension.toLowerCase() === "svg") {
      const serializer = new (element as unknown as QRSVG)._window.XMLSerializer();
      const source = serializer.serializeToString((element as unknown as QRSVG).getElement());
      const svgString = `<?xml version="1.0" standalone="no"?>\r\n${source}`;

      if (typeof Blob !== "undefined" && !this._options.jsdom) {
        return new Blob([svgString], { type: "image/svg+xml" });
      } else {
        return Buffer.from(svgString);
      }
    } else {
      return new Promise((resolve) => {
        const canvas = (element as unknown as QRCanvas).getCanvas();
        if (canvas.toBuffer) {
          resolve(canvas.toBuffer(`image/${extension}`));
        } else {
          canvas.toBlob(resolve, `image/${extension}`, 1);
        }
      });
    }
  }

  async download(downloadOptions?: Partial<DownloadOptions> | string): Promise<void> {
    if (!this._qr) throw "QR code is empty";
    if (typeof Blob === "undefined") throw "Cannot download in Node.js, call getRawData instead.";
    let extension = "png" as Extension;
    let name = "qr";

    //TODO remove deprecated code in the v2
    if (typeof downloadOptions === "string") {
      extension = downloadOptions as Extension;
      console.warn(
        "Extension is deprecated as argument for 'download' method, please pass object { name: '...', extension: '...' } as argument"
      );
    } else if (typeof downloadOptions === "object" && downloadOptions !== null) {
      if (downloadOptions.name) {
        name = downloadOptions.name;
      }
      if (downloadOptions.extension) {
        extension = downloadOptions.extension;
      }
    }

    const element = await this._getQRStylingElement(extension);

    if (extension.toLowerCase() === "svg") {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString((element as unknown as QRSVG).getElement());

      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
      downloadURI(url, `${name}.svg`);
    } else {
      const url = (element as unknown as QRCanvas).getCanvas().toDataURL(`image/${extension}`);
      downloadURI(url, `${name}.${extension}`);
    }
  }

  /**
   * Opens the phone's share sheet with the QR code as a file (Web Share API). Where sharing files is not
   * supported (most desktop browsers), downloads it instead. Resolves to "shared", "downloaded", or
   * "cancelled" when the user closes the share sheet.
   */
  async share(shareOptions: ShareOptions = {}): Promise<"shared" | "downloaded" | "cancelled"> {
    if (!this._qr) throw "QR code is empty";
    const extension = shareOptions.extension || "png";
    const name = shareOptions.name || "qr";
    const nav = typeof navigator !== "undefined" ? (navigator as ShareNavigator) : undefined;

    if (nav?.share && typeof File !== "undefined") {
      const blob = (await this.getRawData(extension)) as Blob;
      const type = extension === "svg" ? "image/svg+xml" : `image/${extension}`;
      const file = new File([blob], `${name}.${extension}`, { type });
      const data = { files: [file], title: shareOptions.title, text: shareOptions.text };
      if (!nav.canShare || nav.canShare(data)) {
        try {
          await nav.share(data);
          return "shared";
        } catch (error) {
          if ((error as { name?: string })?.name === "AbortError") return "cancelled";
          // Any other failure (not allowed, not supported): fall back to a download.
        }
      }
    }

    await this.download({ name, extension });
    return "downloaded";
  }
}

type ShareNavigator = {
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  canShare?: (data: { files?: File[]; title?: string; text?: string }) => boolean;
};
