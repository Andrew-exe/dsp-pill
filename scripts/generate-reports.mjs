// Generates synthetic lab reports and PDF test fixtures. Re-run: npm run generate:reports
// Values MUST mirror src/fixtures/scenarios.ts (guarded by tests/unit/extract-pdf-text.test.ts).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const UNITS = { vitaminD: "ng/mL", b12: "pg/mL", folate: "ng/mL", ferritin: "ng/mL", magnesium: "mmol/L" };
const NAMES = { vitaminD: "25-OH Vitamin D", b12: "Vitamin B12", folate: "Folate", ferritin: "Ferritin", magnesium: "Magnesium" };
const RANGES = { vitaminD: "20 - 50", b12: "200 - 900", folate: "3.0 - 20.0", ferritin: "30 - 300", magnesium: "0.75 - 0.95" };
const V1 = { vitaminD: "18", b12: "480", folate: "6.5", ferritin: "62", magnesium: "0.78" };
const V2 = { vitaminD: "28", b12: "520", folate: "7.2", ferritin: "65", magnesium: "0.85" };
const IDS = Object.keys(NAMES);
const UNSUPPORTED = [["Hemoglobin", "13.5", "g/dL", "12.0 - 15.5"], ["TSH", "1.8", "mIU/L", "0.4 - 4.0"]];

const REPORTS = {
  v1: { file: "dsp-pill-synthetic-report-v1.pdf", date: "Collected: 2026-07-01", values: V1, ranges: RANGES },
  week8: { file: "dsp-pill-synthetic-report-week8.pdf", date: "Collection Date: 08/26/2026", values: V2, ranges: RANGES },
  "scenario-b": {
    file: "dsp-pill-synthetic-report-scenario-b.pdf",
    date: "Collected: 2026-07-01",
    values: { ...V1, ferritin: "180" },
    ranges: { ...RANGES, ferritin: "Female: 15 - 150; Male: 30 - 400" },
  },
};

const COLS = [50, 230, 300, 370];

async function reportPdf({ date, values, ranges }) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const text = (s, x, y, f = font, size = 11) => page.drawText(s, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
  text("dsp-pill Synthetic Laboratory Report", 50, 730, bold, 18);
  text("SYNTHETIC DEMO DATA — NOT A REAL PATIENT", 50, 705, bold, 11);
  text("Patient: Synthetic Patient SP-1842", 50, 680);
  text(date, 50, 662);
  const row = (cells, y, f = font) => cells.forEach((c, i) => text(c, COLS[i], y, f));
  let y = 625;
  row(["Test", "Result", "Unit", "Reference range"], y, bold);
  for (const id of IDS) row([NAMES[id], values[id], UNITS[id], ranges[id]], (y -= 24));
  for (const r of UNSUPPORTED) row(r, (y -= 24));
  text("Synthetic document generated for demonstration. Not for clinical use.", 50, 60, font, 9);
  return doc.save();
}

async function textPagesPdf(n) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= n; i++) {
    doc.addPage([612, 792]).drawText(`Synthetic filler page ${i} of ${n} for dsp-pill intake limits`, { x: 50, y: 700, size: 12, font });
  }
  return doc.save();
}

async function scannedPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawRectangle({ x: 40, y: 40, width: 532, height: 712, color: rgb(0.93, 0.93, 0.9) });
  for (let i = 0; i < 20; i++) page.drawRectangle({ x: 60, y: 700 - i * 30, width: 200 + ((i * 37) % 250), height: 8, color: rgb(0.2, 0.2, 0.2) });
  return doc.save();
}

mkdirSync("public/reports", { recursive: true });
mkdirSync("tests/fixtures/pdf", { recursive: true });

for (const r of Object.values(REPORTS)) writeFileSync(join("public/reports", r.file), await reportPdf(r));
writeFileSync("tests/fixtures/pdf/scanned.pdf", await scannedPdf());
writeFileSync("tests/fixtures/pdf/too-many-pages.pdf", await textPagesPdf(11));

// Encrypted fixture via Ghostscript (system binary).
const tmp = mkdtempSync(join(tmpdir(), "dsp-pill-gen-"));
try {
  const plain = join(tmp, "plain.pdf");
  writeFileSync(plain, await reportPdf(REPORTS.v1));
  execFileSync("gs", ["-q", "-dNOPAUSE", "-dBATCH", "-sDEVICE=pdfwrite", "-sOwnerPassword=owner", "-sUserPassword=user", "-sOutputFile=tests/fixtures/pdf/encrypted.pdf", plain]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log("Generated reports and fixtures.");
