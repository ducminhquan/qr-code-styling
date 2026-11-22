import calculateImageSize from "../tools/calculateImageSize";
import errorCorrectionPercents from "../constants/errorCorrectionPercents";
import QRDot from "../figures/dot/canvas/QRDot";
import QRCornerSquare from "../figures/cornerSquare/canvas/QRCornerSquare";
import QRCornerDot from "../figures/cornerDot/canvas/QRCornerDot";
import { RequiredOptions } from "./QROptions";
import getQRArea from "../tools/qrArea";
import { getPluginArea, runAfterDraw } from "../tools/plugins";
import { isCircle } from "../tools/circle";
import { getShapeLayout } from "../tools/codeShape";
import getCornerTypes, { needsSolidAlignment } from "../tools/cornerTypes";
import getFrameLayout, { getLogoPlate, hasFrame, innerOptions } from "../tools/frameLayout";
import { roundedRect, toCanvas } from "../figures/shapes";
import getModuleRoles from "../art/functionModules";
import { prepareArt, PreparedArt, ArtRect } from "../art/art";
import gradientTypes from "../constants/gradientTypes";
import { QRCode, Gradient, FilterFunction, Canvas } from "../types";

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

export default class QRCanvas {
  _canvas: Canvas;
  _options: RequiredOptions;
  _qr?: QRCode;
  _image?: HTMLImageElement;
  /** Fill used for the dots instead of their color (QR art "colorize"). */
  _dotsFill?: CanvasPattern;
  /** Per-finder colors used when corners have no color of their own (QR art "blend"). */
  _finderColors?: string[];

  //TODO don't pass all options to this class
  constructor(options: RequiredOptions) {
    if (options.nodeCanvas?.createCanvas) {
      this._canvas = options.nodeCanvas.createCanvas(options.width, options.height);
    } else {
      this._canvas = document.createElement("canvas");
    }
    this._canvas.width = options.width;
    this._canvas.height = options.height;
    this._options = options;
  }

  get context(): CanvasRenderingContext2D | null {
    return this._canvas.getContext("2d");
  }

  get width(): number {
    return this._canvas.width;
  }

  get height(): number {
    return this._canvas.height;
  }

  getCanvas(): Canvas {
    return this._canvas;
  }

  clear(): void {
    const canvasContext = this.context;

    if (canvasContext) {
      canvasContext.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  async _drawFramed(qr: QRCode): Promise<void> {
    const layout = getFrameLayout(this._options);
    const inner = new QRCanvas(innerOptions(this._options, layout.qr.size));
    await inner.drawQR(qr);

    const context = this.context as CanvasRenderingContext2D;
    this.clear();
    if (layout.frame) {
      const { thickness, radius, color } = layout.frame;
      context.beginPath();
      toCanvas(context, roundedRect(0, 0, layout.width, layout.height, radius));
      context.fillStyle = color;
      context.fill();
      context.save();
      context.beginPath();
      toCanvas(
        context,
        roundedRect(
          thickness,
          thickness,
          layout.width - 2 * thickness,
          layout.height - 2 * thickness,
          Math.max(0, radius - thickness)
        )
      );
      context.clip();
      this.drawBackground();
      context.restore();
      if (layout.label) {
        const { x, y, width, height } = layout.label.band;
        context.fillStyle = color;
        context.fillRect(x, y, width, height);
      }
    } else {
      this.drawBackground();
    }

    context.drawImage(inner.getCanvas() as unknown as CanvasImageSource, layout.qr.x, layout.qr.y);

    if (layout.label) {
      const { band, font, color, text } = layout.label;
      context.font = font;
      context.fillStyle = color;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, band.x + band.width / 2, band.y + band.height / 2);
    }
  }

  async drawQR(qr: QRCode): Promise<void> {
    await this._drawCode(qr);
    if (this._options.plugins?.length) {
      await runAfterDraw(this._options, {
        type: "canvas",
        area: getPluginArea(this._options, qr.getModuleCount()),
        width: this._options.width,
        height: this._options.height,
        context: this.context as CanvasRenderingContext2D
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

    if (this._options.image) {
      await this.loadImage();
      if (!this._image) return;
      const { imageOptions, qrOptions } = this._options;
      const coverLevel = imageOptions.imageSize * errorCorrectionPercents[qrOptions.errorCorrectionLevel];
      const maxHiddenDots = Math.floor(coverLevel * count * count);

      drawImageSize = calculateImageSize({
        originalWidth: this._image.width,
        originalHeight: this._image.height,
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
      (this.context as CanvasRenderingContext2D).drawImage(art.picture as unknown as CanvasImageSource, 0, 0);
      this._drawArtRects(art.rects);
      this.drawDots(() => false);
      this._finderColors = art.finderColors;
    } else if (art?.mode === "halftone") {
      this._drawArtRects(art.rects);
      // No regular dots, but set up the dots color so corners without their own color use it.
      this.drawDots(() => false);
    } else {
      if (art?.mode === "colorize") {
        const context = this.context as CanvasRenderingContext2D;
        if (art.background) context.drawImage(art.background as unknown as CanvasImageSource, 0, 0);
        this._dotsFill = context.createPattern(art.dots as unknown as CanvasImageSource, "no-repeat") ?? undefined;
      }
      this.drawDots(filter);
      this._dotsFill = undefined;
    }
    this.drawCorners();
    this._finderColors = undefined;

    if (this._options.image) {
      this.drawImage({ width: drawImageSize.width, height: drawImageSize.height, count, dotSize });
    }
  }

  drawBackground(): void {
    const canvasContext = this.context;
    const options = this._options;

    if (canvasContext) {
      if (options.backgroundOptions.gradient) {
        const gradientOptions = options.backgroundOptions.gradient;
        const gradient = this._createGradient({
          context: canvasContext,
          options: gradientOptions,
          additionalRotation: 0,
          x: 0,
          y: 0,
          size: this._canvas.width > this._canvas.height ? this._canvas.width : this._canvas.height
        });

        gradientOptions.colorStops.forEach(({ offset, color }: { offset: number; color: string }) => {
          gradient.addColorStop(offset, color);
        });

        canvasContext.fillStyle = gradient;
      } else if (options.backgroundOptions.color) {
        canvasContext.fillStyle = options.backgroundOptions.color;
      }
      const shaped = !isCircle(options) && getShapeLayout(options, 21);
      if (shaped) {
        const size = Math.min(this._canvas.width, this._canvas.height);
        canvasContext.beginPath();
        toCanvas(
          canvasContext,
          shaped.outline((this._canvas.width - size) / 2, (this._canvas.height - size) / 2, size)
        );
        canvasContext.fill();
        return;
      }
      if (isCircle(options)) {
        const size = Math.min(this._canvas.width, this._canvas.height);
        canvasContext.beginPath();
        canvasContext.arc(this._canvas.width / 2, this._canvas.height / 2, size / 2, 0, Math.PI * 2);
        canvasContext.fill();
        return;
      }
      canvasContext.fillRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  drawDots(filter?: FilterFunction): void {
    if (!this._qr) {
      throw "QR code is not defined";
    }

    const canvasContext = this.context;

    if (!canvasContext) {
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
    const typeDot = new QRDot({ context: canvasContext, type: options.dotsOptions.type });
    const squareDot = new QRDot({ context: canvasContext, type: "square" });
    const solidAlignment = needsSolidAlignment(options.dotsOptions.type);
    const role = solidAlignment ? getModuleRoles(count) : undefined;

    canvasContext.beginPath();

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
        const dot = role && inCode(i, j) && role(i, j) === "alignment" ? squareDot : typeDot;
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
      }
    }

    if (options.dotsOptions.gradient) {
      const gradientOptions = options.dotsOptions.gradient;
      const gradient = this._createGradient({
        context: canvasContext,
        options: gradientOptions,
        additionalRotation: 0,
        x: xBeginning - colorPad,
        y: yBeginning - colorPad,
        size: count * dotSize + 2 * colorPad
      });

      gradientOptions.colorStops.forEach(({ offset, color }: { offset: number; color: string }) => {
        gradient.addColorStop(offset, color);
      });

      canvasContext.fillStyle = canvasContext.strokeStyle = gradient;
    } else if (options.dotsOptions.color) {
      canvasContext.fillStyle = canvasContext.strokeStyle = options.dotsOptions.color;
    }

    if (this._dotsFill) {
      canvasContext.fillStyle = canvasContext.strokeStyle = this._dotsFill;
    }

    canvasContext.fill("evenodd");
  }

  _drawArtRects(rects: ArtRect[]): void {
    const context = this.context;
    if (!context) return;
    rects.forEach(({ x, y, width, height, color, shape }) => {
      context.fillStyle = color;
      if (shape === "circle") {
        context.beginPath();
        context.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(x, y, width, height);
      }
    });
  }

  drawCorners(filter?: FilterFunction): void {
    if (!this._qr) {
      throw "QR code is not defined";
    }

    const canvasContext = this.context;

    if (!canvasContext) {
      throw "QR code is not defined";
    }

    const options = this._options;

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
      if (filter && !filter(column, row)) {
        return;
      }

      const x = xBeginning + column * dotSize * (count - 7);
      const y = yBeginning + row * dotSize * (count - 7);

      if (cornerTypes.square) {
        const cornersSquare = new QRCornerSquare({ context: canvasContext, type: cornerTypes.square });

        canvasContext.beginPath();
        cornersSquare.draw(x, y, cornersSquareSize, rotation);
      } else {
        const dot = new QRDot({ context: canvasContext, type: options.dotsOptions.type });

        canvasContext.beginPath();

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
          }
        }
      }

      if (options.cornersSquareOptions?.gradient) {
        const gradientOptions = options.cornersSquareOptions.gradient;
        const gradient = this._createGradient({
          context: canvasContext,
          options: gradientOptions,
          additionalRotation: rotation,
          x,
          y,
          size: cornersSquareSize
        });

        gradientOptions.colorStops.forEach(({ offset, color }: { offset: number; color: string }) => {
          gradient.addColorStop(offset, color);
        });

        canvasContext.fillStyle = canvasContext.strokeStyle = gradient;
      } else if (options.cornersSquareOptions?.color) {
        canvasContext.fillStyle = canvasContext.strokeStyle = options.cornersSquareOptions.color;
      } else if (this._finderColors) {
        canvasContext.fillStyle = canvasContext.strokeStyle = this._finderColors[index];
      }

      canvasContext.fill("evenodd");

      if (cornerTypes.dot) {
        const cornersDot = new QRCornerDot({ context: canvasContext, type: cornerTypes.dot });

        canvasContext.beginPath();
        cornersDot.draw(x + dotSize * 2, y + dotSize * 2, cornersDotSize, rotation);
      } else {
        const dot = new QRDot({ context: canvasContext, type: options.dotsOptions.type });

        canvasContext.beginPath();

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
          }
        }
      }

      if (options.cornersDotOptions?.gradient) {
        const gradientOptions = options.cornersDotOptions.gradient;
        const gradient = this._createGradient({
          context: canvasContext,
          options: gradientOptions,
          additionalRotation: rotation,
          x: x + dotSize * 2,
          y: y + dotSize * 2,
          size: cornersDotSize
        });

        gradientOptions.colorStops.forEach(({ offset, color }: { offset: number; color: string }) => {
          gradient.addColorStop(offset, color);
        });

        canvasContext.fillStyle = canvasContext.strokeStyle = gradient;
      } else if (options.cornersDotOptions?.color) {
        canvasContext.fillStyle = canvasContext.strokeStyle = options.cornersDotOptions.color;
      } else if (this._finderColors) {
        canvasContext.fillStyle = canvasContext.strokeStyle = this._finderColors[index];
      }

      canvasContext.fill("evenodd");
    });
  }

  loadImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = this._options;

      if (!options.image) {
        return reject("Image is not defined");
      }

      if (options.nodeCanvas?.loadImage) {
        options.nodeCanvas
          .loadImage(options.image)
          .then((image: HTMLImageElement) => {
            // fix blurry svg
            if (/(\.svg$)|(^data:image\/svg)/.test(options.image ?? "")) {
              image.width = this._options.width;
              image.height = this._options.height;
            }
            this._image = image;
            resolve();
          })
          .catch(reject);
      } else {
        const image = new Image();

        if (typeof options.imageOptions.crossOrigin === "string") {
          image.crossOrigin = options.imageOptions.crossOrigin;
        }

        this._image = image;
        image.onload = (): void => {
          resolve();
        };
        image.src = options.image;
      }
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
    const canvasContext = this.context;

    if (!canvasContext) {
      throw "canvasContext is not defined";
    }

    if (!this._image) {
      throw "image is not defined";
    }

    const options = this._options;
    const { x: xBeginning, y: yBeginning } = getQRArea(options, count);
    const dx = xBeginning + options.imageOptions.margin + (count * dotSize - width) / 2;
    const dy = yBeginning + options.imageOptions.margin + (count * dotSize - height) / 2;
    const dw = width - options.imageOptions.margin * 2;
    const dh = height - options.imageOptions.margin * 2;

    if (options.imageOptions.backgroundColor) {
      const plate = getLogoPlate(options, dx, dy, width, height);
      canvasContext.beginPath();
      toCanvas(canvasContext, roundedRect(plate.x, plate.y, plate.width, plate.height, plate.radius));
      canvasContext.fillStyle = options.imageOptions.backgroundColor;
      canvasContext.fill();
    }

    canvasContext.drawImage(this._image, dx, dy, dw < 0 ? 0 : dw, dh < 0 ? 0 : dh);
  }

  _createGradient({
    context,
    options,
    additionalRotation,
    x,
    y,
    size
  }: {
    context: CanvasRenderingContext2D;
    options: Gradient;
    additionalRotation: number;
    x: number;
    y: number;
    size: number;
  }): CanvasGradient {
    let gradient;

    if (options.type === gradientTypes.radial) {
      gradient = context.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size / 2);
    } else {
      const rotation = ((options.rotation || 0) + additionalRotation) % (2 * Math.PI);
      const positiveRotation = (rotation + 2 * Math.PI) % (2 * Math.PI);
      let x0 = x + size / 2;
      let y0 = y + size / 2;
      let x1 = x + size / 2;
      let y1 = y + size / 2;

      if (
        (positiveRotation >= 0 && positiveRotation <= 0.25 * Math.PI) ||
        (positiveRotation > 1.75 * Math.PI && positiveRotation <= 2 * Math.PI)
      ) {
        x0 = x0 - size / 2;
        y0 = y0 - (size / 2) * Math.tan(rotation);
        x1 = x1 + size / 2;
        y1 = y1 + (size / 2) * Math.tan(rotation);
      } else if (positiveRotation > 0.25 * Math.PI && positiveRotation <= 0.75 * Math.PI) {
        y0 = y0 - size / 2;
        x0 = x0 - size / 2 / Math.tan(rotation);
        y1 = y1 + size / 2;
        x1 = x1 + size / 2 / Math.tan(rotation);
      } else if (positiveRotation > 0.75 * Math.PI && positiveRotation <= 1.25 * Math.PI) {
        x0 = x0 + size / 2;
        y0 = y0 + (size / 2) * Math.tan(rotation);
        x1 = x1 - size / 2;
        y1 = y1 - (size / 2) * Math.tan(rotation);
      } else if (positiveRotation > 1.25 * Math.PI && positiveRotation <= 1.75 * Math.PI) {
        y0 = y0 + size / 2;
        x0 = x0 + size / 2 / Math.tan(rotation);
        y1 = y1 - size / 2;
        x1 = x1 - size / 2 / Math.tan(rotation);
      }

      gradient = context.createLinearGradient(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
    }

    return gradient;
  }
}
