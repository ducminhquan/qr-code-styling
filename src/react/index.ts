/**
 * React wrapper: `import { QRCode } from "qr-code-styling-node/react"`.
 *
 *   <QRCode options={{ data: "https://example.com", dotsOptions: { type: "rounded" } }} />
 *
 * The ref gives the QRCodeStyling instance (download, share, getRawData, verify...).
 */
import { createElement, CSSProperties, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import QRCodeStyling from "../core/QRCodeStyling";
import sameOptions, { snapshotOptions } from "../tools/sameOptions";
import { Options } from "../types";

export interface QRCodeProps {
  options: Partial<Options>;
  className?: string;
  style?: CSSProperties;
  /** Called with the instance once the code is drawn, and again after each change. */
  onUpdate?: (qrCode: QRCodeStyling) => void;
}

export const QRCode = forwardRef<QRCodeStyling | undefined, QRCodeProps>(function QRCode(
  { options, className, style, onUpdate },
  ref
) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<QRCodeStyling>();
  const drawn = useRef<Partial<Options>>();
  const appended = useRef(false);

  // Created during the first render so the ref is ready as soon as the component mounts.
  if (!instance.current) {
    instance.current = new QRCodeStyling(options);
    drawn.current = snapshotOptions(options);
  }

  useImperativeHandle(ref, () => instance.current, []);

  useEffect(() => {
    const qrCode = instance.current as QRCodeStyling;
    if (!container.current) return;
    if (!appended.current) {
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

  return createElement("div", { ref: container, className, style });
});

export default QRCode;
export { QRCodeStyling };
