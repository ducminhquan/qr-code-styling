/**
 * React wrapper: `import { QRCode } from "qr-code-styling-node/react"`.
 *
 *   <QRCode options={{ data: "https://example.com", dotsOptions: { type: "rounded" } }} />
 *
 * The ref gives the QRCodeStyling instance (download, share, getRawData, verify...).
 *
 * Server rendering (Next.js, Remix...): a plain code is put in the server HTML by itself. A code with a logo,
 * art, frame or label needs waiting, so pass its markup from a server component or loader:
 *
 *   const svg = await new QRCodeStyling({ ...options, type: "svg" }).getSVGString();
 *   <QRCode options={options} svg={svg} />
 */
import { createElement, CSSProperties, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import QRCodeStyling from "../core/QRCodeStyling";
import sameOptions, { snapshotOptions } from "../tools/sameOptions";
import { Options } from "../types";

export interface QRCodeProps {
  options: Partial<Options>;
  className?: string;
  style?: CSSProperties;
  /**
   * SVG markup shown until the code is drawn in the browser, for server rendering of codes that need waiting
   * (logo, art, frame, label). Get it with `getSVGString()`.
   */
  svg?: string;
  /** Called with the instance once the code is drawn, and again after each change. */
  onUpdate?: (qrCode: QRCodeStyling) => void;
}

export const QRCode = forwardRef<QRCodeStyling | undefined, QRCodeProps>(function QRCode(
  { options, className, style, svg, onUpdate },
  ref
) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<QRCodeStyling>();
  const drawn = useRef<Partial<Options>>();
  const appended = useRef(false);
  // Markup for the server HTML. In the browser it stays "", and React keeps the server's markup on hydration.
  const markup = useRef<string>();

  // Created during the first render so the ref is ready as soon as the component mounts.
  if (!instance.current) {
    instance.current = new QRCodeStyling(options);
    drawn.current = snapshotOptions(options);
  }
  if (markup.current === undefined) {
    markup.current = svg ?? (typeof window === "undefined" ? instance.current._getSVGStringSync() : "");
  }

  useImperativeHandle(ref, () => instance.current, []);

  useEffect(() => {
    const qrCode = instance.current as QRCodeStyling;
    if (!container.current) return;
    if (!appended.current) {
      // Replace the server-rendered markup with the live code.
      container.current.innerHTML = "";
      qrCode.append(container.current);
      appended.current = true;
    } else if (!sameOptions(drawn.current, options)) {
      // update() redraws into the same container.
      qrCode.update(options);
      drawn.current = snapshotOptions(options);
    } else {
      return;
    }
    onUpdate?.(qrCode);
  });

  return createElement("div", {
    ref: container,
    className,
    style,
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: markup.current }
  });
});

export default QRCode;
export { QRCodeStyling };
