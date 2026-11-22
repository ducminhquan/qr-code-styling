/**
 * A small CSV reader for product lists exported from Excel or Google Sheets: quoted fields, quotes
 * inside quotes, line breaks inside quotes, a UTF-8 BOM, and "," ";" or tab as separator (taken from
 * the header line).
 */
export function parseCSV(text: string): Record<string, string>[] {
  const source = text.replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const counts = [",", ";", "\t"].map((sep) => [sep, firstLine.split(sep).length] as const);
  const separator = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((value) => value.trim() !== ""));
  if (!header) return [];
  const keys = header.map((key) => key.trim());
  return body.map((values) => {
    const record: Record<string, string> = {};
    keys.forEach((key, index) => {
      if (key) record[key] = (values[index] ?? "").trim();
    });
    return record;
  });
}

/** Replaces {column} in a template with the row's values, e.g. "https://shop.vn/p/{sku}". */
export const fillTemplate = (template: string, row: Record<string, string>): string =>
  template.replace(/\{([^{}]+)\}/g, (_match, key: string) => row[key.trim()] ?? "");
