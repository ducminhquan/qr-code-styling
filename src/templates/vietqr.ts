/**
 * Ready-made VietQR payment cards: the code in brand colors, a header, and the amount, account name and
 * bank under it. Returns plain options, so anything can still be changed or added.
 */
import { LabelLineOptions, LabelOptions, Options } from "../types";
import { vietQR, vietQRBanks, VietQROptions } from "../payloads/vietqr";
import { labelBandHeight as labelHeight } from "../tools/frameLayout";

export type VietQRTheme = "blue" | "red" | "green" | "purple" | "orange" | "black";

export interface VietQRCardOptions extends VietQROptions {
  /** Account holder name, shown under the amount (accents allowed). */
  accountName?: string;
  /** Color theme, or { color } for your own brand color. Default "blue". */
  theme?: VietQRTheme;
  /** Your own main color, instead of a theme (dark enough to scan on white, e.g. "#0b5394"). */
  color?: string;
  /**
   * Logo in the middle of the code (URL or data URL), e.g. your shop's or the bank's logo. No bank
   * logos are bundled: use logos you are allowed to use.
   */
  logo?: string;
  /** Header text. Default "Quét mã để thanh toán". Empty string for no header. */
  title?: string;
  /** Bank name shown under the code. Default: from the BIN for common banks, otherwise the BIN. */
  bankName?: string;
  /** Also show the transfer description. Default true when there is one. */
  showMessage?: boolean;
  /** Width in px. The height follows from the texts. Default 600. */
  width?: number;
  /** "card" (default): frame, header and details. "plain": just the styled code. */
  layout?: "card" | "plain";
  fontFamily?: string;
}

const THEMES: Record<VietQRTheme, { color: string; accent: string }> = {
  blue: { color: "#0b4ea2", accent: "#062c5f" },
  red: { color: "#c8102e", accent: "#7a0a1c" },
  green: { color: "#0b7a43", accent: "#064d2a" },
  purple: { color: "#6d28d9", accent: "#3b0f80" },
  orange: { color: "#c2410c", accent: "#7c2d12" },
  black: { color: "#111827", accent: "#000000" }
};

/** Display names of the banks in vietQRBanks. */
export const vietQRBankNames: Readonly<Record<string, string>> = Object.freeze({
  "970436": "Vietcombank",
  "970415": "VietinBank",
  "970418": "BIDV",
  "970405": "Agribank",
  "970407": "Techcombank",
  "970422": "MB Bank",
  "970416": "ACB",
  "970432": "VPBank",
  "970423": "TPBank",
  "970403": "Sacombank",
  "970437": "HDBank",
  "970441": "VIB",
  "970443": "SHB",
  "970448": "OCB",
  "970426": "MSB",
  "970440": "SeABank",
  "970431": "Eximbank",
  "970449": "LPBank",
  "970428": "Nam A Bank"
});

/** 150000 -> "150.000 đ". */
export const formatVND = (amount: number | string): string =>
  `${String(amount)
    .replace(/[\s.,]/g, "")
    .replace(/^0+(?=\d)/, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")} đ`;

const binOf = (bank: string): string => {
  const key = String(bank || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
  return /^\d{6}$/.test(key) ? key : vietQRBanks[key] || key;
};

/** Options for a styled VietQR payment code: pass them to new QRCodeStyling(), and add or override any option. */
export function vietQRTemplate(card: VietQRCardOptions): Partial<Options> {
  const data = vietQR(card);
  const theme = THEMES[card.theme || "blue"] || THEMES.blue;
  const color = card.color || theme.color;
  const accent = card.color || theme.accent;
  const width = card.width || 600;
  const fontFamily = card.fontFamily || "Helvetica, Arial, sans-serif";

  const style: Partial<Options> = {
    data,
    width,
    height: width,
    // High error correction keeps room for a logo and for wear on printed stands.
    qrOptions: { errorCorrectionLevel: card.logo ? "H" : "Q" },
    dotsOptions: { type: "rounded", color },
    cornersSquareOptions: { type: "extra-rounded", color: accent },
    cornersDotOptions: { type: "dot", color: accent },
    backgroundOptions: { color: "#ffffff" },
    svgOptions: { mergePaths: true }
  };
  if (card.logo) {
    style.image = card.logo;
    style.imageOptions = {
      imageSize: 0.35,
      margin: Math.round(width / 80),
      backgroundColor: "#ffffff",
      hideBackgroundDots: true
    };
  }
  if (card.layout === "plain") return { ...style, margin: Math.round(width / 20) };

  const unit = width;
  const title = card.title === undefined ? "Quét mã để thanh toán" : card.title;
  const bankName = card.bankName || vietQRBankNames[binOf(card.bank)] || binOf(card.bank);
  const details: LabelLineOptions[] = [];
  if (card.amount !== undefined && card.amount !== null && card.amount !== "") {
    details.push({ text: formatVND(card.amount), fontSize: Math.round(unit * 0.075), fontWeight: 800, color: accent });
  }
  if (card.accountName) {
    details.push({
      text: card.accountName.toUpperCase(),
      fontSize: Math.round(unit * 0.045),
      fontWeight: 700,
      color: "#111827"
    });
  }
  details.push({
    text: `${bankName} · ${String(card.account).replace(/\s/g, "")}`,
    fontSize: Math.round(unit * 0.038),
    fontWeight: 400,
    color: "#374151"
  });
  if (card.message && card.showMessage !== false) {
    details.push({ text: card.message, fontSize: Math.round(unit * 0.034), fontWeight: 400, color: "#6b7280" });
  }

  const labels: LabelOptions[] = [];
  if (title) {
    labels.push({ position: "top", text: title, fontSize: Math.round(unit * 0.05), fontFamily, color: "#ffffff" });
  }
  labels.push({ position: "bottom", lines: details, background: "none", fontFamily, fontSize: details[0].fontSize });

  const frameWidth = Math.max(2, Math.round(unit * 0.012));
  const padding = Math.round(unit * 0.05);
  const height = width + labels.reduce((sum, label) => sum + labelHeight(label, unit), 0);

  return {
    ...style,
    height,
    frameOptions: { color, width: frameWidth, radius: Math.round(unit * 0.05), padding },
    labelOptions: labels
  };
}
