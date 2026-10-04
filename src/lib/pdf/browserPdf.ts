import { MAX_PDF_BYTES, PdfExtractionError, extractPdfText, type PdfJsLike } from "./extractPdfText";

const MANUAL = "You can enter your values manually instead.";

export const PDF_ERROR_MESSAGES: Record<PdfExtractionError["code"], string> = {
  not_pdf: `That file doesn't look like a PDF, so we can't read it. ${MANUAL}`,
  too_large: `That PDF is larger than 10 MB, which is more than we can read locally. ${MANUAL}`,
  too_many_pages: `That PDF has more than 10 pages, which is more than we can read locally. ${MANUAL}`,
  encrypted: `That PDF is password protected, so we can't open it. ${MANUAL}`,
  no_text: `This looks like a scanned or image-only PDF, so there's no text we can read locally. ${MANUAL}`,
  unreadable: `We couldn't read that PDF; it may be damaged or in an unusual format. ${MANUAL}`,
};

/** Browser-only: parses the file locally with PDF.js; nothing is uploaded. */
export async function extractPdfTextInBrowser(file: File): Promise<{ pages: number; text: string }> {
  if (file.size > MAX_PDF_BYTES) throw new PdfExtractionError("too_large", "PDF is larger than 10 MB.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  return extractPdfText(pdfjs as unknown as PdfJsLike, data);
}
