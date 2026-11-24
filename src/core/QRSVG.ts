import calculateImageSize from "../tools/calculateImageSize";
import errorCorrectionPercents from "../constants/errorCorrectionPercents";
import QRDot from "../figures/dot/svg/QRDot";
import QRDotCanvas from "../figures/dot/canvas/QRDot";
import PathRecorder from "../tools/pathRecorder";
import QRCornerSquare from "../figures/cornerSquare/svg/QRCornerSquare";
import QRCornerDot from "../figures/cornerDot/svg/QRCornerDot";
import { RequiredOptions } from "./QROptions";
import getQRArea, { getShapeBox } from "../tools/qrArea";
import { getPluginArea, runAfterDraw } from "../tools/plugins";
import { isCircle } from "../tools/circle";
import { getShapeLayout } from "../tools/codeShape";
import getCornerTypes, { needsSolidAlignment } from "../tools/cornerTypes";
import getFrameLayout, { getLogoPlate, hasFrame, innerOptions } from "../tools/frameLayout";
import { roundedRect, toSVGPath } from "../figures/shapes";
import getModuleRoles from "../art/functionModules";
import { prepareArt, PreparedArt, ArtRect } from "../art/art";
import gradientTypes from "../constants/gradientTypes";
import { QRCode, FilterFunction, Gradient, Window, Canvas } from "../types";
import { createVirtualWindow, hasBrowserDom } from "../tools/svgDom";
import { getImageSize, loadImageData, toDataUrl } from "../tools/imageSize";

declare const window: Window;

const squareMask = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1]
];

const dotMask = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0]
];

export default class QRSVG {
  _canvas?: Canvas;
  _window: Window;
  _element: SVGElement;
  _defs: SVGElement;
  _dotsClipPath?: SVGElement;
  _cornersSquareClipPath?: SVGElement;
  _cornersDotClipPath?: SVGElement;
  _options: RequiredOptions;
  _qr?: QRCode;
  _image?: HTMLImageElement;
  _imageUri?: string;
  /** True when no browser DOM or jsdom is available and the built-in virtual DOM is used. */
  _virtual = false;
  /** Image used to paint the dots instead of their color (QR art "colorize"). */
  _dotsImageHref?: string;
  /** Per-finder colors used when corners have no color of their own (QR art "blend"). */
  _finderColors?: string[];

  //TODO don't pass all options to this class
  constructor(options: RequiredOptions, sharedWindow?: Window) {
    if (sharedWindow) {
      this._window = sharedWindow;
      this._virtual = !!(sharedWindow as unknown as { isVirtual?: boolean }).isVirtual;
    } else if (options.jsdom) {
      this._window = new options.jsdom("", { resources: "usable" }).window;
    } else if (hasBrowserDom()) {
      this._window = window;
    } else {
      this._window = createVirtualWindow() as unknown as Window;
      this._virtual = true;
    }
    this._element = this._window.document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this._element.setAttribute("width", String(options.width));
    this._element.setAttribute("height", String(options.height));
    this._defs = this._window.document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this._element.appendChild(this._defs);

    if (options.imageOptions.saveAsBlob && !this._virtual) {
      if (options.nodeCanvas?.createCanvas) {
        this._canvas = options.nodeCanvas.createCanvas(options.width, options.height);
      } else {
        this._canvas = document.createElement("canvas");
      }
      this._canvas.width = options.width;
      this._canvas.height = options.height;
    }
    this._imageUri = options.image;

    this._options = options;
  }

  get width(): number {
    return this._options.width;
  }

  get height(): number {
    return this._options.height;
  }

  getElement(): SVGElement {
    return this._element;
  }

  clear(): void {
    const oldElement = this._element;
    this._element = oldElement.cloneNode(false) as SVGElement;
    oldElement?.parentNode?.replaceChild(this._element, oldElement);
    this._defs = this._window.document.createElementNS("http://www.w3.org/2000/svg", "defs");
    this._element.appendChild(this._defs);
  }

  _svgElement(name: string, attributes: Record<string, string | number>): SVGElement {
    const element = this._window.document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attributes).forEach((key) => element.setAttribute(key, String(attributes[key])));
    return element;
  }

  async _drawFramed(qr: QRCode): Promise<void> {
    const layout = getFrameLayout(this._options);
    const inner = new QRSVG(innerOptions(this._options, layout.qr.size), this._window);
    await inner.drawQR(qr);

    this.clear();
    if (layout.frame) {
      const { thickness, radius, color } = layout.frame;
      this._element.appendChild(
        this._svgElement("path", { d: toSVGPath(roundedRect(0, 0, layout.width, layout.height, radius)), fill: color })
      );
      this._element.appendChild(
        this._svgElement("path", {
          d: toSVGPath(
            roundedRect(
              thickness,
              thickness,
              layout.width - 2 * thickness,
              layout.height - 2 * thickness,
              Math.max(0, radius - thickness)
            )
          ),
          fill: layout.background
        })
      );
    } else {
      this.drawBackground(true);
    }
    layout.labels.forEach(({ band, fill }) => {
      if (!fill) return;
      const { x, y, width, height } = band;
      this._element.appendChild(this._svgElement("rect", { x, y, width, height, fill }));
    });

    const element = inner.getElement();
    element.setAttribute("x", String(layout.qr.x));
    element.setAttribute("y", String(layout.qr.y));
    this._element.appendChild(element);

    layout.labels.forEach((label) =>
      label.lines.forEach(({ x, y, color, text, fontSize, fontFamily, fontWeight }) => {
        const element = this._svgElement("text", {
          x,
          y,
          fill: color,
          "font-family": fontFamily,
          "font-size": fontSize,
          "font-weight": fontWeight,
          "text-anchor": "middle",
          "dominant-baseline": "central"
        });
        element.textContent = text;
        this._element.appendChild(element);
      })
    );
  }

  async drawQR(qr: QRCode): Promise<void> {
    await this._drawCode(qr);
    if (this._options.plugins?.length) {
      await runAfterDraw(this._options, {
        type: "svg",
        area: getPluginArea(this._options, qr.getModuleCount()),
        width: this._options.width,
        height: this._options.height,
        svg: this._element,
        document: this._window.document as unknown as Document
      });
    }
  }

  async _drawCode(qr: QRCode): Promise<void> {
    if (hasFrame(this._options)) {
      this._qr = qr;
      return this._drawFramed(qr);
    }
    const count = qr.getModuleCount();
    const { dotSize } = getQRArea(this._options, count);
    let drawImageSize = {
      hideXDots: 0,
      hideYDots: 0,
      width: 0,
      height: 0
    };

    this._qr = qr;

    const logo = this._options.image ? await this._tryLoadImage() : undefined;
    if (logo) {
      //We need it to get image size
      this.imageToBlob();
      const { imageOptions, qrOptions } = this._options;
      const coverLevel = imageOptions.imageSize * errorCorrectionPercents[qrOptions.errorCorrectionLevel];
      const maxHiddenDots = Math.floor(coverLevel * count * count);

      drawImageSize = calculateImageSize({
        originalWidth: logo.width,
        originalHeight: logo.height,
        maxHiddenDots,
        maxHiddenAxisDots: count - 14,
        dotSize
      });
    }

    const filter = (i: number, j: number): boolean => {
      if (this._options.imageOptions.hideBackgroundDots) {
        if (
          i >= (count - drawImageSize.hideXDots) / 2 &&
          i < (count + drawImageSize.hideXDots) / 2 &&
          j >= (count - drawImageSize.hideYDots) / 2 &&
          j < (count + drawImageSize.hideYDots) / 2
        ) {
          return false;
        }
      }

      if (squareMask[i]?.[j] || squareMask[i - count + 7]?.[j] || squareMask[i]?.[j - count + 7]) {
        return false;
      }

      if (dotMask[i]?.[j] || dotMask[i - count + 7]?.[j] || dotMask[i]?.[j - count + 7]) {
        return false;
      }

      return true;
    };

    let art: PreparedArt | undefined;
    if (this._options.art) {
      art = await prepareArt(this._options, qr, filter);
    }

    this.clear();
    this.drawBackground();
    if (art?.mode === "blend") {
      this._appendImage(art.picture.toDataURL("image/png"), 0, 0);
      this._drawArtRects(art.rects);
      this.drawDots(() => false);
      this._finderColors = art.finderColors;
    } else if (art?.mode === "halftone") {
      this._drawArtRects(art.rects);
      // No regular dots, but set up the dots color so corners without their own color use it.
      this.drawDots(() => false);
    } else {
      if (art?.mode === "colorize") {
        if (art.background) this._appendImage(art.background.toDataURL("image/png"), 0, 0);
        this._dotsImageHref = art.dots.toDataURL("image/png");
      }
      this.drawDots(filter);
      this._dotsImageHref = undefined;
    }
    this.drawCorners();
    this._finderColors = undefined;

    if (this._options.image && this._image) {
      this.drawImage({ width: drawImageSize.width, height: drawImageSize.height, count, dotSize });
    }
  }

  /** plain: fill the whole area, ignoring the shape (the panel behind a framed or labelled code). */
  drawBackground(plain = false): void {
    const element = this._element;
    const options = this._options;

    if (element) {
      const gradientOptions = options.backgroundOptions?.gradient;
      const color = options.backgroundOptions?.color;

      if (gradientOptions || color) {
        const count = this._qr?.getModuleCount() ?? 21;
        const shaped = !plain && !isCircle(options) && getShapeLayout(options, count);
        if (shaped) {
          // Heart, hexagon...: clip the background to the outline around the dots.
          const { x: boxX, y: boxY, size } = getShapeBox(options, count);
          const clipPath = this._window.document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
          clipPath.setAttribute("id", "clip-path-background-color");
          clipPath.appendChild(
            this._svgElement("path", {
              d: toSVGPath(shaped.outline(boxX, boxY, size))
            })
          );
          this._defs.appendChild(clipPath);
          this._createColor({
            options: gradientOptions,
            color: color,
            additionalRotation: 0,
            x: boxX,
            y: boxY,
            height: size,
            width: size,
            name: "background-color"
          });
          return;
        }
        if (!plain && isCircle(options)) {
          const size = Math.min(options.width, options.height);
          this._createColor({
            options: gradientOptions,
            color: color,
            additionalRotation: 0,
            x: (options.width - size) / 2,
            y: (options.height - size) / 2,
            height: size,
            width: size,
            name: "background-color",
            radius: size / 2
          });
          return;
        }
        this._createColor({
          options: gradientOptions,
          color: color,
          additionalRotation: 0,
          x: 0,
          y: 0,
          height: options.height,
          width: options.width,
          name: "background-color"
        });
      }
    }
  }

  drawDots(filter?: FilterFunction): void {
    if (!this._qr) {
      throw "QR code is not defined";
    }

    const options = this._options;
    const count = this._qr.getModuleCount();

    if (count > options.width || count > options.height) {
      throw "The canvas is too small.";
    }

    const { dotSize, x: xBeginning, y: yBeginning } = getQRArea(options, count);
    // Round codes draw decorative dots around the code: the dots color covers the whole circle.
    const colorPad = (getShapeLayout(options, count)?.pad ?? 0) * dotSize;
    const typeDot = new QRDot({
      svg: this._element,
      type: options.dotsOptions.type,
      window: this._window
    });
    const squareDot = new QRDot({ svg: this._element, type: "square", window: this._window });
    // svgOptions.mergePaths: draw every dot into one recorded path instead of one element per module.
    const recorder = options.svgOptions?.mergePaths ? new PathRecorder() : undefined;
    const recorded = recorder ? (recorder as unknown as CanvasRenderingContext2D) : undefined;
    const typeDotMerged = recorded ? new QRDotCanvas({ context: recorded, type: options.dotsOptions.type }) : undefined;
    const squareDotMerged = recorded ? new QRDotCanvas({ context: recorded, type: "square" }) : undefined;
    const solidAlignment = needsSolidAlignment(options.dotsOptions.type);
    const role = solidAlignment ? getModuleRoles(count) : undefined;

    this._dotsClipPath = this._window.document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    this._dotsClipPath.setAttribute("id", "clip-path-dot-color");
    this._defs.appendChild(this._dotsClipPath);

    this._createColor({
      options: options.dotsOptions?.gradient,
      color: options.dotsOptions.color,
      additionalRotation: 0,
      x: xBeginning - colorPad,
      y: yBeginning - colorPad,
      height: count * dotSize + 2 * colorPad,
      width: count * dotSize + 2 * colorPad,
      name: "dot-color",
      imageHref: this._dotsImageHref
    });

    const circle = getShapeLayout(options, count);
    const from = circle ? -circle.pad : 0;
    const to = circle ? count + circle.pad : count;
    const inCode = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < count && j < count;
    const isDark = (i: number, j: number): boolean => {
      if (filter && !filter(i, j)) return false;
      if (inCode(i, j)) return !!this._qr && this._qr.isDark(i, j);
      return !!circle && circle.isDecoration(i, j);
    };

    for (let i = from; i < to; i++) {
      for (let j = from; j < to; j++) {
        if (inCode(i, j) ? (filter && !filter(i, j)) || !this._qr?.isDark(i, j) : !isDark(i, j)) {
          continue;
        }

        const alignment = role && inCode(i, j) && role(i, j) === "alignment";
        const dot = recorded
          ? ((alignment ? squareDotMerged : typeDotMerged) as QRDotCanvas)
          : alignment
            ? squareDot
            : typeDot;
        dot.draw(
          xBeginning + i * dotSize,
          yBeginning + j * dotSize,
          dotSize,
          (xOffset: number, yOffset: number): boolean => {
            if (!circle) {
              if (i + xOffset < 0 || j + yOffset < 0 || i + xOffset >= count || j + yOffset >= count) return false;
              if (filter && !filter(i + xOffset, j + yOffset)) return false;
              return !!this._qr && this._qr.isDark(i + xOffset, j + yOffset);
            }
            return isDark(i + xOffset, j + yOffset);
          }
        );

        if (!recorded && (dot as QRDot)._element && this._dotsClipPath) {
          this._dotsClipPath.appendChild((dot as QRDot)._element as SVGElement);
        }
      }
    }

    if (recorder && recorder.d && this._dotsClipPath) {
      // The canvas renderer fills dots with even-odd; use the same rule so both look the same.
      this._dotsClipPath.appendChild(this._svgElement("path", { d: recorder.d, "clip-rule": "evenodd" }));
    }
  }

  drawCorners(): void {
    if (!this._qr) {
      throw "QR code is not defined";
    }

    const element = this._element;
    const options = this._options;

    if (!element) {
      throw "Element code is not defined";
    }

    const count = this._qr.getModuleCount();
    const { dotSize, x: xBeginning, y: yBeginning } = getQRArea(options, count);
    const cornersSquareSize = dotSize * 7;
    const cornersDotSize = dotSize * 3;
    const cornerTypes = getCornerTypes(options);

    [
      [0, 0, 0],
      [1, 0, Math.PI / 2],
      [0, 1, -Math.PI / 2]
    ].forEach(([column, row, rotation], index) => {
      const x = xBeginning + column * dotSize * (count - 7);
      const y = yBeginning + row * dotSize * (count - 7);
      let cornersSquareClipPath = this._dotsClipPath;
      let cornersDotClipPath = this._dotsClipPath;

      if (options.cornersSquareOptions?.gradient || options.cornersSquareOptions?.color || this._finderColors) {
        cornersSquareClipPath = this._window.document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        cornersSquareClipPath.setAttribute("id", `clip-path-corners-square-color-${column}-${row}`);
        this._defs.appendChild(cornersSquareClipPath);
        this._cornersSquareClipPath = this._cornersDotClipPath = cornersDotClipPath = cornersSquareClipPath;

        this._createColor({
          options: options.cornersSquareOptions?.gradient,
          color: options.cornersSquareOptions?.color ?? this._finderColors?.[index],
          additionalRotation: rotation,
          x,
          y,
          height: cornersSquareSize,
          width: cornersSquareSize,
          name: `corners-square-color-${column}-${row}`
        });
      }

      if (cornerTypes.square) {
        const cornersSquare = new QRCornerSquare({
          svg: this._element,
          type: cornerTypes.square,
          window: this._window
        });

        cornersSquare.draw(x, y, cornersSquareSize, rotation);

        if (cornersSquare._element && cornersSquareClipPath) {
          cornersSquareClipPath.appendChild(cornersSquare._element);
        }
      } else if (options.svgOptions?.mergePaths) {
        this._drawMergedMask(squareMask, x, y, dotSize, cornersSquareClipPath);
      } else {
        const dot = new QRDot({
          svg: this._element,
          type: options.dotsOptions.type,
          window: this._window
        });

        for (let i = 0; i < squareMask.length; i++) {
          for (let j = 0; j < squareMask[i].length; j++) {
            if (!squareMask[i]?.[j]) {
              continue;
            }

            dot.draw(
              x + i * dotSize,
              y + j * dotSize,
              dotSize,
              (xOffset: number, yOffset: number): boolean => !!squareMask[i + xOffset]?.[j + yOffset]
            );

            if (dot._element && cornersSquareClipPath) {
              cornersSquareClipPath.appendChild(dot._element);
            }
          }
        }
      }

      if (options.cornersDotOptions?.gradient || options.cornersDotOptions?.color || this._finderColors) {
        cornersDotClipPath = this._window.document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
        cornersDotClipPath.setAttribute("id", `clip-path-corners-dot-color-${column}-${row}`);
        this._defs.appendChild(cornersDotClipPath);
        this._cornersDotClipPath = cornersDotClipPath;

        this._createColor({
          options: options.cornersDotOptions?.gradient,
          color: options.cornersDotOptions?.color ?? this._finderColors?.[index],
          additionalRotation: rotation,
          x: x + dotSize * 2,
          y: y + dotSize * 2,
          height: cornersDotSize,
          width: cornersDotSize,
          name: `corners-dot-color-${column}-${row}`
        });
      }

      if (cornerTypes.dot) {
        const cornersDot = new QRCornerDot({
          svg: this._element,
          type: cornerTypes.dot,
          window: this._window
        });

        cornersDot.draw(x + dotSize * 2, y + dotSize * 2, cornersDotSize, rotation);

        if (cornersDot._element && cornersDotClipPath) {
          cornersDotClipPath.appendChild(cornersDot._element);
        }
      } else if (options.svgOptions?.mergePaths) {
        this._drawMergedMask(dotMask, x, y, dotSize, cornersDotClipPath);
      } else {
        const dot = new QRDot({
          svg: this._element,
          type: options.dotsOptions.type,
          window: this._window
        });

        for (let i = 0; i < dotMask.length; i++) {
          for (let j = 0; j < dotMask[i].length; j++) {
            if (!dotMask[i]?.[j]) {
              continue;
            }

            dot.draw(
              x + i * dotSize,
              y + j * dotSize,
              dotSize,
              (xOffset: number, yOffset: number): boolean => !!dotMask[i + xOffset]?.[j + yOffset]
            );

            if (dot._element && cornersDotClipPath) {
              cornersDotClipPath.appendChild(dot._element);
            }
          }
        }
      }
    });
  }

  /** Finder modules drawn with the dots' own figure, as one path (svgOptions.mergePaths). */
  _drawMergedMask(mask: number[][], x: number, y: number, dotSize: number, clipPath?: SVGElement): void {
    const recorder = new PathRecorder();
    const dot = new QRDotCanvas({
      context: recorder as unknown as CanvasRenderingContext2D,
      type: this._options.dotsOptions.type
    });
    for (let i = 0; i < mask.length; i++) {
      for (let j = 0; j < mask[i].length; j++) {
        if (!mask[i]?.[j]) continue;
        dot.draw(x + i * dotSize, y + j * dotSize, dotSize, (xOffset: number, yOffset: number): boolean => {
          return !!mask[i + xOffset]?.[j + yOffset];
        });
      }
    }
    if (recorder.d && clipPath)
      clipPath.appendChild(this._svgElement("path", { d: recorder.d, "clip-rule": "evenodd" }));
  }

  _drawArtRects(rects: ArtRect[]): void {
    rects.forEach(({ x, y, width, height, color, shape }) => {
      this._element.appendChild(
        shape === "circle"
          ? this._svgElement("circle", { cx: x + width / 2, cy: y + height / 2, r: width / 2, fill: color })
          : this._svgElement("rect", { x, y, width, height, fill: color })
      );
    });
  }

  _appendImage(href: string, x: number, y: number): void {
    const image = this._window.document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", href);
    image.setAttribute("x", String(x));
    image.setAttribute("y", String(y));
    image.setAttribute("width", String(this._options.width));
    image.setAttribute("height", String(this._options.height));
    this._element.appendChild(image);
  }

  imageToBlob(): void {
    if (!this._image) return;
    // fix blurry svg
    if (/(\.svg$)|(^data:image\/svg)/.test(this._options.image ?? "")) {
      this._image.width = this._options.width;
      this._image.height = this._options.height;
    }
    if (this._options.imageOptions.saveAsBlob && this._canvas) {
      const ctx = this._canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(this._image, 0, 0, this._canvas.width, this._canvas.height);
        this._imageUri = this._canvas.toDataURL("image/png");
      }
    }
  }

  async _loadImageWithoutDom(): Promise<void> {
    const source = this._options.image;
    if (!source) throw "Image is not defined";
    const data = await loadImageData(source);
    const { width, height } = getImageSize(data);

    this._image = { width, height } as HTMLImageElement;
    if (this._options.imageOptions.saveAsBlob && !source.startsWith("data:")) {
      // Embed the original bytes so the SVG renders anywhere, without rasterizing a vector logo.
      this._imageUri = toDataUrl(data);
    }
  }

  /**
   * Loads the logo and says whether there is one to draw. In the browser a logo that fails to load (bad URL,
   * CORS, broken file) is left out and the code is drawn without it, instead of the draw never finishing.
   * On Node a failed logo still rejects, as before.
   */
  async _tryLoadImage(): Promise<HTMLImageElement | undefined> {
    await this.loadImage();
    return this._image;
  }

  loadImage(): Promise<void> {
    if (this._virtual) {
      return this._loadImageWithoutDom();
    }

    return new Promise((resolve, reject) => {
      const options = this._options;

      if (options.nodeCanvas?.loadImage && options.image) {
        options.nodeCanvas
          .loadImage(options.image)
          .then((image: HTMLImageElement) => {
            this._image = image;
            resolve();
          })
          .catch(reject);
        return;
      }
      const image = new this._window.Image();

      if (!options.image) {
        return reject("Image is not defined");
      }

      if (typeof options.imageOptions.crossOrigin === "string") {
        image.crossOrigin = options.imageOptions.crossOrigin;
      }

      this._image = image;
      image.onload = (): void => {
        resolve();
      };
      image.onerror = (): void => {
        console.warn("qr-code-styling: the logo could not be loaded and was left out:", options.image);
        this._image = undefined;
        this._imageUri = undefined;
        resolve();
      };
      image.src = options.image;
    });
  }

  drawImage({
    width,
    height,
    count,
    dotSize
  }: {
    width: number;
    height: number;
    count: number;
    dotSize: number;
  }): void {
    const options = this._options;
    const { x: xBeginning, y: yBeginning } = getQRArea(options, count);
    const dx = xBeginning + options.imageOptions.margin + (count * dotSize - width) / 2;
    const dy = yBeginning + options.imageOptions.margin + (count * dotSize - height) / 2;
    const dw = width - options.imageOptions.margin * 2;
    const dh = height - options.imageOptions.margin * 2;

    if (options.imageOptions.backgroundColor) {
      const plate = getLogoPlate(options, dx, dy, width, height);
      this._element.appendChild(
        this._svgElement("path", {
          d: toSVGPath(roundedRect(plate.x, plate.y, plate.width, plate.height, plate.radius)),
          fill: options.imageOptions.backgroundColor
        })
      );
    }

    const image = this._window.document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", this._imageUri || "");
    image.setAttribute("x", String(dx));
    image.setAttribute("y", String(dy));
    image.setAttribute("width", `${dw}px`);
    image.setAttribute("height", `${dh}px`);

    this._element.appendChild(image);
  }

  _createColor({
    options,
    color,
    additionalRotation,
    x,
    y,
    height,
    width,
    name,
    imageHref,
    radius
  }: {
    imageHref?: string;
    /** Rounds the rect's corners (a circle when it is half the size). */
    radius?: number;
    options?: Gradient;
    color?: string;
    additionalRotation: number;
    x: number;
    y: number;
    height: number;
    width: number;
    name: string;
  }): void {
    const size = width > height ? width : height;
    if (imageHref) {
      const image = this._window.document.createElementNS("http://www.w3.org/2000/svg", "image");
      image.setAttribute("href", imageHref);
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
      image.setAttribute("width", String(this._options.width));
      image.setAttribute("height", String(this._options.height));
      image.setAttribute("clip-path", `url('#clip-path-${name}')`);
      this._element.appendChild(image);
      return;
    }
    const rect = this._window.document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("height", String(height));
    rect.setAttribute("width", String(width));
    rect.setAttribute("clip-path", `url('#clip-path-${name}')`);
    if (radius) {
      rect.setAttribute("rx", String(radius));
      rect.setAttribute("ry", String(radius));
    }

    if (options) {
      let gradient: SVGElement;
      if (options.type === gradientTypes.radial) {
        gradient = this._window.document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
        gradient.setAttribute("id", name);
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        gradient.setAttribute("fx", String(x + width / 2));
        gradient.setAttribute("fy", String(y + height / 2));
        gradient.setAttribute("cx", String(x + width / 2));
        gradient.setAttribute("cy", String(y + height / 2));
        gradient.setAttribute("r", String(size / 2));
      } else {
        const rotation = ((options.rotation || 0) + additionalRotation) % (2 * Math.PI);
        const positiveRotation = (rotation + 2 * Math.PI) % (2 * Math.PI);
        let x0 = x + width / 2;
        let y0 = y + height / 2;
        let x1 = x + width / 2;
        let y1 = y + height / 2;

        if (
          (positiveRotation >= 0 && positiveRotation <= 0.25 * Math.PI) ||
          (positiveRotation > 1.75 * Math.PI && positiveRotation <= 2 * Math.PI)
        ) {
          x0 = x0 - width / 2;
          y0 = y0 - (height / 2) * Math.tan(rotation);
          x1 = x1 + width / 2;
          y1 = y1 + (height / 2) * Math.tan(rotation);
        } else if (positiveRotation > 0.25 * Math.PI && positiveRotation <= 0.75 * Math.PI) {
          y0 = y0 - height / 2;
          x0 = x0 - width / 2 / Math.tan(rotation);
          y1 = y1 + height / 2;
          x1 = x1 + width / 2 / Math.tan(rotation);
        } else if (positiveRotation > 0.75 * Math.PI && positiveRotation <= 1.25 * Math.PI) {
          x0 = x0 + width / 2;
          y0 = y0 + (height / 2) * Math.tan(rotation);
          x1 = x1 - width / 2;
          y1 = y1 - (height / 2) * Math.tan(rotation);
        } else if (positiveRotation > 1.25 * Math.PI && positiveRotation <= 1.75 * Math.PI) {
          y0 = y0 + height / 2;
          x0 = x0 + width / 2 / Math.tan(rotation);
          y1 = y1 - height / 2;
          x1 = x1 - width / 2 / Math.tan(rotation);
        }

        gradient = this._window.document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", name);
        gradient.setAttribute("gradientUnits", "userSpaceOnUse");
        gradient.setAttribute("x1", String(Math.round(x0)));
        gradient.setAttribute("y1", String(Math.round(y0)));
        gradient.setAttribute("x2", String(Math.round(x1)));
        gradient.setAttribute("y2", String(Math.round(y1)));
      }

      options.colorStops.forEach(({ offset, color }: { offset: number; color: string }) => {
        const stop = this._window.document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop.setAttribute("offset", `${100 * offset}%`);
        stop.setAttribute("stop-color", color);
        gradient.appendChild(stop);
      });

      rect.setAttribute("fill", `url('#${name}')`);
      this._defs.appendChild(gradient);
    } else if (color) {
      rect.setAttribute("fill", color);
    }

    this._element.appendChild(rect);
  }
}
