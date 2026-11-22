export interface UnknownObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type DotType = "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded";
export type CornerDotType = "dot" | "square";
export type CornerSquareType = "dot" | "square" | "extra-rounded";
export type Extension = "svg" | "png" | "jpeg" | "webp";
export type GradientType = "radial" | "linear";
export type DrawType = "canvas" | "svg";

export interface Canvas extends HTMLCanvasElement {
  toBuffer?: (type: string) => Buffer;
  createCanvas?: (width: number, height: number) => Canvas;
  loadImage?: (image: string) => Promise<HTMLImageElement>;
}

export interface Window {
  Image: typeof HTMLImageElement;
  XMLSerializer: typeof XMLSerializer;
  document: Document;
}
declare const window: Window;

interface JsDomOptions {
  resources: string;
}
export class JSDom {
  window: Window;
  _options: JsDomOptions;
  _input: string;

  constructor(input: string, options: JsDomOptions) {
    this._options = options;
    this._input = input;
    this.window = window;
  }
}

export type Gradient = {
  type: GradientType;
  rotation?: number;
  colorStops: {
    offset: number;
    color: string;
  }[];
};

export interface DotTypes {
  [key: string]: DotType;
}

export interface GradientTypes {
  [key: string]: GradientType;
}

export interface CornerDotTypes {
  [key: string]: CornerDotType;
}

export interface CornerSquareTypes {
  [key: string]: CornerSquareType;
}

export interface DrawTypes {
  [key: string]: DrawType;
}

export type TypeNumber =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40;

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type Mode = "Numeric" | "Alphanumeric" | "Byte" | "Kanji";
export interface QRCode {
  addData(data: string, mode?: Mode): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
  createImgTag(cellSize?: number, margin?: number): string;
  createSvgTag(cellSize?: number, margin?: number): string;
  createSvgTag(opts?: { cellSize?: number; margin?: number; scalable?: boolean }): string;
  createDataURL(cellSize?: number, margin?: number): string;
  createTableTag(cellSize?: number, margin?: number): string;
  createASCII(cellSize?: number, margin?: number): string;
  renderTo2dContext(context: CanvasRenderingContext2D, cellSize?: number): void;
}

export interface ResvgConstructor {
  new (
    svg: string | Uint8Array,
    options?: { fitTo?: { mode: "original" } | { mode: "width"; value: number }; background?: string }
  ): { render(): { asPng(): Uint8Array; pixels: Uint8Array; width: number; height: number } };
}

export type ArtMode = "halftone" | "colorize";

export interface ArtOptions {
  /** The picture to blend into the QR code (URL or data URL). */
  image: string;
  /**
   * "halftone": the picture is redrawn as fine black/white (or colored) pixels, with the QR modules in the middle.
   * "colorize": the dots keep their shape and are painted with a darkened copy of the picture.
   */
  mode?: ArtMode;
  /** halftone only: use the picture's own colors instead of dotsOptions/backgroundOptions colors. */
  colored?: boolean;
  /** colorize only: also show a light copy of the picture behind the dots. Default true. */
  background?: boolean;
  /** 0 to 1. Higher keeps dark and light further apart: easier to scan, less of the picture. Default 0.5 (halftone), 0.7 (colorize). */
  contrast?: number;
  crossOrigin?: string;
}

/** Same signature as jsQR: (rgba, width, height) => { data } | null. */
export type QRDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: Record<string, unknown>
) => { data: string } | null;

export interface VerifyOptions {
  /** A QR decoder, for example `jsQR` from the "jsqr" package. */
  decoder: QRDecoder;
  /** For QR art: raise art.contrast step by step until the code scans. Default false. */
  adjust?: boolean;
}

export interface VerifyResult {
  readable: boolean;
  /** Text the decoder read, if any. */
  decoded?: string;
  /** Final art.contrast when art is used. */
  contrast?: number;
  attempts: number;
}

export type Options = {
  type?: DrawType;
  width?: number;
  height?: number;
  margin?: number;
  data?: string;
  image?: string;
  nodeCanvas?: Canvas;
  jsdom?: typeof JSDom;
  /**
   * The `Resvg` class from `@resvg/resvg-js`. Lets `getRawData("png")` work on a server without
   * node-canvas: the QR code is drawn as SVG and rasterized by resvg.
   */
  resvg?: ResvgConstructor;
  /** Blend a picture into the QR code. Needs a canvas (browser, or nodeCanvas on Node). */
  art?: ArtOptions;
  qrOptions?: {
    typeNumber?: TypeNumber;
    mode?: Mode;
    errorCorrectionLevel?: ErrorCorrectionLevel;
  };
  imageOptions?: {
    saveAsBlob?: boolean;
    hideBackgroundDots?: boolean;
    imageSize?: number;
    crossOrigin?: string;
    margin?: number;
  };
  dotsOptions?: {
    type?: DotType;
    color?: string;
    gradient?: Gradient;
  };
  cornersSquareOptions?: {
    type?: CornerSquareType;
    color?: string;
    gradient?: Gradient;
  };
  cornersDotOptions?: {
    type?: CornerDotType;
    color?: string;
    gradient?: Gradient;
  };
  backgroundOptions?: {
    color?: string;
    gradient?: Gradient;
  };
};

export type FilterFunction = (i: number, j: number) => boolean;

export type DownloadOptions = {
  name?: string;
  extension?: Extension;
};

export type DrawArgs = {
  x: number;
  y: number;
  size: number;
  rotation?: number;
  getNeighbor?: GetNeighbor;
};

export type BasicFigureDrawArgs = {
  x: number;
  y: number;
  size: number;
  rotation?: number;
};

export type RotateFigureArgs = {
  x: number;
  y: number;
  size: number;
  rotation?: number;
  draw: () => void;
};

export type DrawArgsCanvas = DrawArgs & {
  context: CanvasRenderingContext2D;
};

export type BasicFigureDrawArgsCanvas = BasicFigureDrawArgs & {
  context: CanvasRenderingContext2D;
};

export type RotateFigureArgsCanvas = RotateFigureArgs & {
  context: CanvasRenderingContext2D;
};

export type GetNeighbor = (x: number, y: number) => boolean;
