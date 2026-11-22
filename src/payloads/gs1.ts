/**
 * GS1 Digital Link: one QR code on the pack that a till scans as the product's GTIN and a phone opens as
 * a web page. Batch, serial number and expiry date can travel with it.
 */

export interface GS1Options {
  /** GTIN-8, -12, -13 or -14 (the barcode number). Its check digit is verified. */
  gtin: string;
  /** Batch or lot number (AI 10). */
  lot?: string;
  /** Serial number (AI 21). */
  serial?: string;
  /** Expiry date (AI 17): a Date, "YYYY-MM-DD" or "YYMMDD". */
  expiry?: Date | string;
  /** Best-before date (AI 15), same formats. */
  bestBefore?: Date | string;
  /** Your own resolver, e.g. "https://qr.example.com". Default "https://id.gs1.org". */
  domain?: string;
  /** Any other GS1 application identifiers, added as query parameters, e.g. { "3103": "000500" }. */
  extra?: Record<string, string>;
}

/** GS1 mod-10 check digit of the digits before it. */
const checkDigit = (digits: string): number => {
  let sum = 0;
  for (let i = digits.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += Number(digits[i]) * weight;
  }
  return (10 - (sum % 10)) % 10;
};

/** Pads a GTIN to 14 digits after checking its length and check digit. */
export function normalizeGTIN(gtin: string): string {
  const digits = String(gtin || "").replace(/[\s-]/g, "");
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) {
    throw new Error(`Invalid GTIN "${gtin}": 8, 12, 13 or 14 digits`);
  }
  if (checkDigit(digits.slice(0, -1)) !== Number(digits[digits.length - 1])) {
    throw new Error(`Invalid GTIN "${gtin}": wrong check digit`);
  }
  return digits.padStart(14, "0");
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** A GS1 date, YYMMDD. */
const toGS1Date = (value: Date | string): string => {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) throw new Error("Invalid date");
    return pad2(value.getFullYear() % 100) + pad2(value.getMonth() + 1) + pad2(value.getDate());
  }
  const text = String(value).trim();
  if (/^\d{6}$/.test(text)) return text;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new Error(`Invalid date "${value}": use a Date, "YYYY-MM-DD" or "YYMMDD"`);
  return match[1].slice(2) + match[2] + match[3];
};

/** Encodes a value for a Digital Link path or query (GS1 allows a limited character set). */
const encodeValue = (value: string): string =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export function gs1(options: GS1Options): string {
  const domain = (options.domain || "https://id.gs1.org").replace(/\/+$/, "");
  let path = `/01/${normalizeGTIN(options.gtin)}`;
  // Key qualifiers go in the path, in the order GS1 defines for GTIN: lot (10), then serial (21).
  if (options.lot) path += `/10/${encodeValue(options.lot)}`;
  if (options.serial) path += `/21/${encodeValue(options.serial)}`;

  const query: string[] = [];
  if (options.expiry) query.push(`17=${toGS1Date(options.expiry)}`);
  if (options.bestBefore) query.push(`15=${toGS1Date(options.bestBefore)}`);
  Object.keys(options.extra || {}).forEach((ai) => {
    if (!/^\d{2,4}$/.test(ai)) throw new Error(`Invalid GS1 application identifier "${ai}"`);
    query.push(`${ai}=${encodeValue(String(options.extra![ai]))}`);
  });

  return domain + path + (query.length ? `?${query.join("&")}` : "");
}
