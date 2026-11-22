/**
 * Builders for the data of common QR codes: Wi-Fi, contact card, calendar event, e-mail, phone, SMS,
 * location, VietQR bank transfer and GS1 Digital Link. They only return a string, to pass as `data`.
 */
import { vietQR, vietQRBanks } from "../payloads/vietqr";
import { gs1 } from "../payloads/gs1";

export type { VietQROptions } from "../payloads/vietqr";
export type { GS1Options } from "../payloads/gs1";
export { vietQR, vietQRBanks, gs1 };

export interface WifiOptions {
  ssid: string;
  password?: string;
  /** Default "WPA" when there is a password, otherwise "nopass". */
  encryption?: "WPA" | "WEP" | "nopass";
  hidden?: boolean;
}

export interface VCardOptions {
  firstName?: string;
  lastName?: string;
  /** Full name shown by phones. Default: first and last name. */
  name?: string;
  organization?: string;
  title?: string;
  phone?: string | string[];
  email?: string | string[];
  url?: string;
  address?: { street?: string; city?: string; region?: string; postalCode?: string; country?: string };
  note?: string;
}

export interface EventOptions {
  title: string;
  start: Date | string;
  end?: Date | string;
  /** Dates only, no time of day. */
  allDay?: boolean;
  location?: string;
  description?: string;
}

/** Escapes \ ; , : and " for the Wi-Fi format. */
const escapeWifi = (value: string): string => value.replace(/([\\;,:"])/g, "\\$1");

/** Escapes text values for vCard and iCalendar. */
const escapeText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const list = (value?: string | string[]): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export function wifi({ ssid, password, encryption, hidden }: WifiOptions): string {
  const type = encryption || (password ? "WPA" : "nopass");
  let data = `WIFI:T:${type};S:${escapeWifi(ssid)};`;
  if (type !== "nopass" && password) data += `P:${escapeWifi(password)};`;
  if (hidden) data += "H:true;";
  return `${data};`;
}

export function vCard(contact: VCardOptions): string {
  const first = contact.firstName || "";
  const last = contact.lastName || "";
  const fullName = contact.name || [first, last].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeText(last)};${escapeText(first)};;;`,
    `FN:${escapeText(fullName)}`
  ];
  if (contact.organization) lines.push(`ORG:${escapeText(contact.organization)}`);
  if (contact.title) lines.push(`TITLE:${escapeText(contact.title)}`);
  list(contact.phone).forEach((phone) => lines.push(`TEL;TYPE=CELL:${escapeText(phone)}`));
  list(contact.email).forEach((email) => lines.push(`EMAIL:${escapeText(email)}`));
  if (contact.url) lines.push(`URL:${escapeText(contact.url)}`);
  if (contact.address) {
    const { street = "", city = "", region = "", postalCode = "", country = "" } = contact.address;
    lines.push(`ADR;TYPE=WORK:;;${[street, city, region, postalCode, country].map(escapeText).join(";")}`);
  }
  if (contact.note) lines.push(`NOTE:${escapeText(contact.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

const formatDate = (value: Date | string, allDay?: boolean): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  if (allDay) return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
};

export function event({ title, start, end, allDay, location, description }: EventOptions): string {
  const dateType = allDay ? ";VALUE=DATE" : "";
  const lines = ["BEGIN:VEVENT", `SUMMARY:${escapeText(title)}`, `DTSTART${dateType}:${formatDate(start, allDay)}`];
  if (end) lines.push(`DTEND${dateType}:${formatDate(end, allDay)}`);
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function email({ to, subject, body }: { to: string; subject?: string; body?: string }): string {
  const query = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`]
    .filter(Boolean)
    .join("&");
  return `mailto:${to}${query ? `?${query}` : ""}`;
}

export const phone = (number: string): string => `tel:${number.replace(/[^\d+*#]/g, "")}`;

export const sms = ({ number, message }: { number: string; message?: string }): string =>
  `SMSTO:${number.replace(/[^\d+]/g, "")}:${message || ""}`;

export const geo = ({ latitude, longitude }: { latitude: number; longitude: number }): string =>
  `geo:${latitude},${longitude}`;

export default { wifi, vCard, event, email, phone, sms, geo, vietQR, vietQRBanks, gs1 };
