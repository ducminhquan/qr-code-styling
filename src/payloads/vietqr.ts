/**
 * VietQR: the NAPAS bank transfer QR code (EMVCo merchant-presented format) that every Vietnamese
 * banking app scans. Static codes leave the amount to the payer; with `amount` the code is dynamic.
 */

export interface VietQROptions {
  /**
   * The bank: its 6-digit NAPAS BIN ("970436") or a short name from `vietQRBanks` ("VCB", "TCB"...).
   */
  bank: string;
  /** Account number, or card number with `type: "card"`. */
  account: string;
  /** Amount in VND, a whole number. Leave out to let the payer type it. */
  amount?: number | string;
  /** Transfer description (order number...). Accents are removed, since banks expect plain ASCII. */
  message?: string;
  /** "account" (default) for an account number, "card" for a card number. */
  type?: "account" | "card";
  /** Optional merchant name and city, shown by some apps. Accents are removed. */
  merchantName?: string;
  city?: string;
}

/**
 * NAPAS BINs of common banks, keyed by short name. Check a BIN against the NAPAS / VietQR bank list
 * before printing codes for a bank not listed here; any BIN can be passed as `bank` directly.
 */
export const vietQRBanks: Readonly<Record<string, string>> = Object.freeze({
  VCB: "970436", // Vietcombank
  VIETCOMBANK: "970436",
  CTG: "970415", // VietinBank
  VIETINBANK: "970415",
  BIDV: "970418",
  AGRIBANK: "970405",
  VBA: "970405",
  TCB: "970407", // Techcombank
  TECHCOMBANK: "970407",
  MB: "970422", // MB Bank
  MBBANK: "970422",
  ACB: "970416",
  VPB: "970432", // VPBank
  VPBANK: "970432",
  TPB: "970423", // TPBank
  TPBANK: "970423",
  STB: "970403", // Sacombank
  SACOMBANK: "970403",
  HDB: "970437", // HDBank
  HDBANK: "970437",
  VIB: "970441",
  SHB: "970443",
  OCB: "970448",
  MSB: "970426",
  SEAB: "970440", // SeABank
  SEABANK: "970440",
  EIB: "970431", // Eximbank
  EXIMBANK: "970431",
  LPB: "970449", // LPBank
  LPBANK: "970449",
  NAB: "970428", // Nam A Bank
  NAMABANK: "970428"
});

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as EMVCo requires, over the string's bytes. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Removes Vietnamese accents and anything else outside printable ASCII. */
export const toPlainASCII = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** One EMVCo field: 2-digit id, 2-digit length, value. */
const field = (id: string, value: string): string => {
  if (value.length > 99) throw new Error(`VietQR field ${id} is longer than 99 characters`);
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
};

export function vietQR(options: VietQROptions): string {
  const { account, amount, message, type = "account", merchantName, city } = options;
  const bankKey = String(options.bank || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
  const bin = /^\d{6}$/.test(bankKey) ? bankKey : vietQRBanks[bankKey];
  if (!bin) {
    throw new Error(`Unknown bank "${options.bank}": pass its 6-digit NAPAS BIN, e.g. { bank: "970436" }`);
  }
  const accountNumber = String(account || "").replace(/\s/g, "");
  if (!/^[0-9A-Za-z]{1,19}$/.test(accountNumber)) {
    throw new Error(`Invalid account number "${account}": letters and digits only, at most 19`);
  }

  let amountText: string | undefined;
  if (amount !== undefined && amount !== null && amount !== "") {
    amountText = String(amount).replace(/[\s.,]/g, "");
    if (!/^\d{1,13}$/.test(amountText) || Number(amountText) <= 0) {
      throw new Error(`Invalid amount "${amount}": a whole number of VND, greater than 0`);
    }
    amountText = String(Number(amountText));
  }

  const beneficiary = field("00", bin) + field("01", accountNumber);
  const merchantAccount =
    field("00", "A000000727") + field("01", beneficiary) + field("02", type === "card" ? "QRIBFTTC" : "QRIBFTTA");

  let data =
    field("00", "01") +
    field("01", amountText ? "12" : "11") +
    field("38", merchantAccount) +
    field("53", "704") +
    (amountText ? field("54", amountText) : "") +
    field("58", "VN");
  if (merchantName) data += field("59", toPlainASCII(merchantName).slice(0, 25));
  if (city) data += field("60", toPlainASCII(city).slice(0, 15));
  const purpose = message ? toPlainASCII(message) : "";
  if (purpose) data += field("62", field("08", purpose.slice(0, 50)));

  data += "6304";
  return data + crc16(data);
}
