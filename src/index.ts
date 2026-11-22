import QRCodeStyling from "./core/QRCodeStyling";
import dotTypes from "./constants/dotTypes";
import cornerDotTypes from "./constants/cornerDotTypes";
import cornerSquareTypes from "./constants/cornerSquareTypes";
import errorCorrectionLevels from "./constants/errorCorrectionLevels";
import errorCorrectionPercents from "./constants/errorCorrectionPercents";
import modes from "./constants/modes";
import qrTypes from "./constants/qrTypes";
import drawTypes from "./constants/drawTypes";
import payload from "./tools/payloads";
import templates, { vietQRBankNames, formatVND } from "./templates";

export * from "./types";
export type { VietQRCardOptions, VietQRTheme } from "./templates";
export type { CheckIssue, CheckLevel, CheckOptions, CheckResult } from "./tools/check";
export type { WifiOptions, VCardOptions, EventOptions, VietQROptions, GS1Options } from "./tools/payloads";

export {
  dotTypes,
  cornerDotTypes,
  cornerSquareTypes,
  errorCorrectionLevels,
  errorCorrectionPercents,
  modes,
  qrTypes,
  drawTypes,
  payload,
  templates,
  vietQRBankNames,
  formatVND
};

export default QRCodeStyling;
