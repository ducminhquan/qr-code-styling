export interface UnknownObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type DotType =
  | "dots"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "square"
  | "extra-rounded"
  | "diamond"
  | "small-square"
  | "vertical-lines"
  | "horizontal-lines"
  | "fluid"
  | "wave"
  | "blob"
  | "circuit";
export type CornerDotType = "dot" | "square" | "rounded";
export type CornerSquareType = "dot" | "square" | "extra-rounded" | "rounded";
export type Extension = "svg" | "png" | "jpeg" | "webp";
export type GradientType = "radial" | "linear";
export type DrawType = "canvas" | "svg";
export type ShapeType = "square" | "circle" | "heart" | "hexagon" | "octagon" | "diamond";

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

export type ArtMode = "halftone" | "colorize" | "blend";

export interface ArtOptions {
  /** The picture to blend into the QR code (URL or data URL). */
  image: string;
  /**
   * "halftone": the picture is redrawn as fine black/white (or colored) pixels, with the QR modules in the middle.
   * "colorize": the dots keep their shape and are painted with a darkened copy of the picture.
   * "blend": the picture fills the whole image; dots are drawn only where the picture is not already
   * dark or light enough for the code, so it reads as an illustration.
   */
  mode?: ArtMode;
  /** halftone only: use the picture's own colors instead of dotsOptions/backgroundOptions colors. */
  colored?: boolean;
  /** colorize only: also show a light copy of the picture behind the dots. Default true. */
  background?: boolean;
  /** 0 to 1. Higher keeps dark and light further apart: easier to scan, less of the picture. Default 0.5 (halftone), 0.7 (colorize), 0.6 (blend). */
  contrast?: number;
  crossOrigin?: string;
  /**
   * Put the code in a square of the picture instead of the middle, in pixels of the output:
   * { x, y, size }. Mostly for "blend", where the picture fills the whole image. The margin is ignored.
   */
  placement?: { x: number; y: number; size: number };
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

export interface FrameOptions {
  /** Frame and label band color. Default "#000". */
  color?: string;
  /** Border thickness in px. Default 4% of the size. */
  width?: number;
  /** Outer corner radius in px. Default 0. */
  radius?: number;
  /** Space between the frame and the QR code in px. Default 4% of the size. */
  padding?: number;
}

export interface LabelLineOptions {
  text: string;
  /** Each defaults to the label's own setting. */
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface LabelOptions {
  /** The text. A line break ("\n") starts a new line. */
  text?: string;
  /** Several lines, each with its own size, weight or color (instead of text). */
  lines?: LabelLineOptions[];
  position?: "top" | "bottom";
  /** Default white on a frame band, otherwise the dots color. */
  color?: string;
  /** In px. Default 7% of the size. */
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  /** Fill of the label's band: a color, or "none". Default the frame color when there is a frame, otherwise none. */
  background?: string;
}

export type Options = {
  type?: DrawType;
  /**
   * "circle", "heart", "hexagon", "octagon" or "diamond": a shaped QR code. The real code stays square in
   * the middle and the rest of the shape is filled with decorative dots in the same style; the background
   * takes the shape. Default "square".
   */
  shape?: ShapeType;
  /** SVG output only. */
  /** Plugins that adjust options and draw on top of the code. See QRPlugin. */
  plugins?: QRPlugin[];
  svgOptions?: {
    /** Draw all dots as one path instead of one element per module: smaller files, faster rendering. Default false. */
    mergePaths?: boolean;
  };
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
  /**
   * Text put in front of every id inside the SVG (clip paths, gradients), for example "menu-". Use it when
   * you inline several SVG strings from getRawData("svg") in one page. Codes shown with append() get
   * unique ids on their own when they would clash.
   */
  idPrefix?: string;
  /**
   * Accessible name read by screen readers, e.g. "Pay 150.000 d to Long Chau". The SVG gets role="img",
   * aria-label and a <title> (also shown as a tooltip); a canvas in the browser gets role="img" and aria-label.
   * Without it the output is unchanged.
   */
  title?: string;
  /** Blend a picture into the QR code. Needs a canvas (browser, or nodeCanvas on Node). */
  art?: ArtOptions;
  /** A border around the code. The code shrinks to fit inside width x height. */
  frameOptions?: FrameOptions;
  /**
   * Text above or below the code, such as "Scan to order". Pass an array for a label on top and one at the
   * bottom; each can have several lines.
   */
  labelOptions?: LabelOptions | LabelOptions[];
  qrOptions?: {
    typeNumber?: TypeNumber;
    mode?: Mode;
    errorCorrectionLevel?: ErrorCorrectionLevel;
    /**
     * How text with accents is written. "utf-8" (default): any non-ASCII text is UTF-8.
     * "latin1": Latin-1 text (é, à, ê...) is one byte per character as in 1.x; other text is still UTF-8.
     */
    encoding?: "utf-8" | "latin1";
  };
  imageOptions?: {
    saveAsBlob?: boolean;
    hideBackgroundDots?: boolean;
    imageSize?: number;
    crossOrigin?: string;
    margin?: number;
    /** Plate drawn behind the logo, e.g. "#ffffff". */
    backgroundColor?: string;
    /** Corner radius of the plate, 0 (square) to 0.5 (round). Default 0.2. */
    backgroundRadius?: number;
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

export type ShareOptions = DownloadOptions & {
  /** Title and text passed to the share sheet. */
  title?: string;
  text?: string;
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

/** Where the code (without margin and frame) is drawn in the output, in pixels. */
export interface PluginArea {
  x: number;
  y: number;
  /** Width and height of the code. */
  size: number;
  /** Size of one module. */
  dotSize: number;
  /** Modules across. */
  count: number;
}

export interface PluginDrawContext {
  type: DrawType;
  options: Options;
  area: PluginArea;
  width: number;
  height: number;
  /** Canvas output: the 2D context to draw on. */
  context?: CanvasRenderingContext2D;
  /** SVG output: the root <svg> element, and the document to create elements with. */
  svg?: SVGElement;
  document?: Document;
}

/**
 * A plugin. Both hooks are optional.
 * - configure(options): return option changes to merge in before drawing (called again on every update, so
 *   return the same changes for the same options).
 * - afterDraw(draw): draw extra things on top, on the canvas context or into the SVG.
 */
export interface QRPlugin {
  name?: string;
  configure?: (options: Options) => Partial<Options> | void;
  afterDraw?: (draw: PluginDrawContext) => void | Promise<void>;
}
