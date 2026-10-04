import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { MAX_PDF_BYTES, PdfExtractionError, extractPdfText, type PdfJsLike } from "@/lib/pdf/extractPdfText";
import { parseReportText } from "@/lib/pdf/parseReportText";
import { FOLLOWUP_V2_BIOMARKERS, PRIMARY_V1_BIOMARKERS, SCENARIO_B_BIOMARKERS } from "@/fixtures/scenarios";
import type { BiomarkerReading } from "@/lib/domain/types";

const lib = pdfjs as unknown as PdfJsLike;
const load = (p: string) => new Uint8Array(readFileSync(resolve(__dirname, "../..", p)));
const report = (n: string) => load(`public/reports/dsp-pill-synthetic-report-${n}.pdf`);

async function expectCode(data: Uint8Array, code: string) {
  await expect(extractPdfText(lib, data)).rejects.toMatchObject({ name: "PdfExtractionError", code });
}

function expectMatchesFixture(parsed: ReturnType<typeof parseReportText>, fixture: BiomarkerReading[], date: string) {
  expect(parsed.collectedOn).toBe(date);
  expect(parsed.readings).toHaveLength(fixture.length);
  for (const f of fixture) {
    const p = parsed.readings.find((r) => r.id === f.id)!;
    expect({ value: p.value, unit: p.unit, ranges: p.ranges, issues: p.issues }).toEqual({ value: f.value, unit: f.unit, ranges: f.ranges, issues: [] });
  }
  expect(parsed.unsupportedAnalytes).toEqual(["Hemoglobin", "TSH"]);
}

describe("extractPdfText", () => {
  it("extracts the v1 report and matches the fixture exactly", async () => {
    const { pages, text } = await extractPdfText(lib, report("v1"));
    expect(pages).toBe(1);
    const parsed = parseReportText(text);
    expect(parsed.readings.map((r) => r.value)).toEqual([18, 480, 6.5, 62, 0.78]);
    expectMatchesFixture(parsed, PRIMARY_V1_BIOMARKERS, "2026-07-01");
  });

  it("extracts the week-8 report", async () => {
    const parsed = parseReportText((await extractPdfText(lib, report("week8"))).text);
    expect(parsed.readings.map((r) => r.value)).toEqual([28, 520, 7.2, 65, 0.85]);
    expectMatchesFixture(parsed, FOLLOWUP_V2_BIOMARKERS, "2026-08-26");
  });

  it("extracts the scenario-B report", async () => {
    const parsed = parseReportText((await extractPdfText(lib, report("scenario-b"))).text);
    expectMatchesFixture(parsed, SCENARIO_B_BIOMARKERS, "2026-07-01");
  });

  it("does not detach the caller's buffer", async () => {
    const data = report("v1");
    await extractPdfText(lib, data);
    expect(data.byteLength).toBeGreaterThan(0);
  });

  it("rejects a scanned PDF as no_text", async () => expectCode(load("tests/fixtures/pdf/scanned.pdf"), "no_text"));
  it("rejects an encrypted PDF", async () => expectCode(load("tests/fixtures/pdf/encrypted.pdf"), "encrypted"));
  it("rejects an 11-page PDF", async () => expectCode(load("tests/fixtures/pdf/too-many-pages.pdf"), "too_many_pages"));
  it("rejects oversize input before parsing", async () => expectCode(new Uint8Array(MAX_PDF_BYTES + 1), "too_large"));
  it("rejects non-PDF bytes", async () =>
    expectCode(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]), "not_pdf"));
  it("rejects a corrupt PDF as unreadable", async () => expectCode(new TextEncoder().encode("%PDF-1.7\ngarbage"), "unreadable"));

  it("exposes PdfExtractionError", () => {
    expect(new PdfExtractionError("no_text", "x")).toBeInstanceOf(Error);
  });
});
