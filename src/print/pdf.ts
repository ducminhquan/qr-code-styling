/** A minimal PDF writer: one full-page RGB image per page. */

const encoder = new TextEncoder();

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  // Built into browsers and Node 18+. "deflate" is the zlib format that PDF's FlateDecode reads.
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export interface PDFPageImage {
  /** RGBA pixels, 4 bytes each. */
  pixels: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  /** Page size in points (1/72 inch). */
  widthPt: number;
  heightPt: number;
}

/** RGBA to RGB, blending onto white. */
const toRGB = ({ pixels, width, height }: PDFPageImage): Uint8Array => {
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < width * height * 4; i += 4, j += 3) {
    const alpha = pixels[i + 3] / 255;
    rgb[j] = Math.round(pixels[i] * alpha + 255 * (1 - alpha));
    rgb[j + 1] = Math.round(pixels[i + 1] * alpha + 255 * (1 - alpha));
    rgb[j + 2] = Math.round(pixels[i + 2] * alpha + 255 * (1 - alpha));
  }
  return rgb;
};

const number = (value: number): string => String(Math.round(value * 1000) / 1000);

export async function writePDF(pages: PDFPageImage[], title = "QR codes"): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array): void => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string, stream?: Uint8Array): void => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\n`);
    if (stream) {
      push("stream\n");
      push(stream);
      push("\nendstream\n");
    }
    push("endobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  // 1 catalog, 2 pages, 3 info, then 3 objects per page: page, contents, image.
  const pageIds = pages.map((_page, index) => 4 + index * 3);
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  const safeTitle = title.replace(/[^\x20-\x7e]/g, "").replace(/([\\()])/g, "\\$1");
  object(3, `<< /Title (${safeTitle}) /Producer (qr-code-styling-node) >>`);

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const id = pageIds[index];
    const content = encoder.encode(`q ${number(page.widthPt)} 0 0 ${number(page.heightPt)} 0 0 cm /Im0 Do Q`);
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(page.widthPt)} ${number(page.heightPt)}] ` +
        `/Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`
    );
    object(id + 1, `<< /Length ${content.length} >>`, content);
    const image = await deflate(toRGB(page));
    object(
      id + 2,
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>`,
      image
    );
  }

  const objectCount = 4 + pages.length * 3;
  const xref = length;
  let table = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let id = 1; id < objectCount; id++) table += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${objectCount} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const result = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  return result;
}
