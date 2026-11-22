/** UTF-8 bytes of a string (works without TextEncoder, for old browsers). */
export default function toUTF8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code < 0xdc00 && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next < 0xe000) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return bytes;
}

/**
 * True when the text should be written as UTF-8: any non-ASCII character by default, or with
 * encoding "latin1" only characters outside Latin-1 (which cannot be one byte each).
 */
export const needsUTF8 = (text: string, encoding: "utf-8" | "latin1" = "utf-8"): boolean => {
  const limit = encoding === "latin1" ? 0xff : 0x7f;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > limit) return true;
  return false;
};
