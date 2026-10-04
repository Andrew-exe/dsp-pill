export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 10;

export type PdfExtractionCode = "not_pdf" | "too_large" | "too_many_pages" | "encrypted" | "no_text" | "unreadable";

export class PdfExtractionError extends Error {
  code: PdfExtractionCode;
  constructor(code: PdfExtractionCode, message: string) {
    super(message);
    this.name = "PdfExtractionError";
    this.code = code;
  }
}

type TextItem = { str: string; transform: number[] };

/** Minimal subset of pdfjs-dist used here. */
export interface PdfJsLike {
  getDocument(src: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }> }>;
      destroy?(): Promise<void>;
    }>;
    destroy?(): Promise<void>;
  };
}

const Y_TOLERANCE = 2;

function pageToLines(items: unknown[]): string[] {
  const rows: { y: number; parts: { x: number; str: string }[] }[] = [];
  for (const raw of items) {
    const item = raw as Partial<TextItem>;
    if (typeof item.str !== "string" || !item.str.trim() || !item.transform) continue;
    const [x, y] = [item.transform[4], item.transform[5]];
    const row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE);
    if (row) row.parts.push({ x, str: item.str });
    else rows.push({ y, parts: [{ x, str: item.str }] });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.str.trim()).join("  "));
}

export async function extractPdfText(pdfjs: PdfJsLike, data: Uint8Array): Promise<{ pages: number; text: string }> {
  if (data.byteLength > MAX_PDF_BYTES) throw new PdfExtractionError("too_large", "PDF is larger than 10 MB.");
  const header = new TextDecoder("latin1").decode(data.subarray(0, 5));
  if (header !== "%PDF-") throw new PdfExtractionError("not_pdf", "File is not a PDF.");

  const task = pdfjs.getDocument({ data: data.slice() });
  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    if ((err as { name?: string })?.name === "PasswordException") {
      throw new PdfExtractionError("encrypted", "PDF is password protected.");
    }
    throw new PdfExtractionError("unreadable", "PDF could not be read.");
  }
  try {
    if (doc.numPages > MAX_PDF_PAGES) throw new PdfExtractionError("too_many_pages", "PDF has more than 10 pages.");
    const lines: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      lines.push(...pageToLines((await page.getTextContent()).items));
    }
    const text = lines.join("\n");
    if (text.replace(/\s/g, "").length < 20) throw new PdfExtractionError("no_text", "PDF has no readable text.");
    return { pages: doc.numPages, text };
  } catch (err) {
    if (err instanceof PdfExtractionError) throw err;
    throw new PdfExtractionError("unreadable", "PDF could not be read.");
  } finally {
    await task.destroy?.().catch(() => undefined);
  }
}
