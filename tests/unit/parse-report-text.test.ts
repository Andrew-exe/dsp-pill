import { describe, expect, it } from "vitest";
import { parseReportText } from "@/lib/pdf/parseReportText";

const V1 = `dsp-pill Synthetic Laboratory Report
SYNTHETIC DEMO DATA — NOT A REAL PATIENT
Patient: Synthetic Patient SP-1842
Collected: 2026-07-01
Test  Result  Unit  Reference range
25-OH Vitamin D  18  ng/mL  20 - 50
Vitamin B12  480  pg/mL  200 - 900
Folate  6.5  ng/mL  3.0 - 20.0
Ferritin  62  ng/mL  30 - 300
Magnesium  0.78  mmol/L  0.75 - 0.95
Hemoglobin  13.5  g/dL  12.0 - 15.5
TSH  1.8  mIU/L  0.4 - 4.0`;

const byId = (r: ReturnType<typeof parseReportText>, id: string) => r.readings.find((x) => x.id === id)!;

describe("parseReportText", () => {
  it("parses the v1 report", () => {
    const r = parseReportText(V1);
    expect(r.collectedOn).toBe("2026-07-01");
    expect(r.readings).toHaveLength(5);
    expect(byId(r, "vitaminD")).toMatchObject({ value: 18, unit: "ng/mL", ranges: [{ low: 20, high: 50, unit: "ng/mL" }], issues: [] });
    expect(byId(r, "b12").value).toBe(480);
    expect(byId(r, "folate").ranges).toEqual([{ low: 3, high: 20, unit: "ng/mL" }]);
    expect(byId(r, "magnesium").value).toBe(0.78);
    expect(r.unsupportedAnalytes).toEqual(["Hemoglobin", "TSH"]);
  });

  it("flags a missing unit", () => {
    const r = parseReportText("Ferritin 62 30 - 300");
    expect(byId(r, "ferritin")).toMatchObject({ value: 62, unit: null });
    expect(byId(r, "ferritin").issues).toContain("missing_unit");
  });

  it("flags conflicting duplicates", () => {
    const r = parseReportText("25-OH Vitamin D 18 ng/mL 20 - 50\nVitamin D, 25-Hydroxy 21 ng/mL 20 - 50");
    expect(r.readings).toHaveLength(1);
    expect(byId(r, "vitaminD")).toMatchObject({ value: null, candidates: [18, 21] });
    expect(byId(r, "vitaminD").issues).toContain("conflicting_duplicate");
  });

  it("collapses identical duplicates", () => {
    const r = parseReportText("Ferritin 62 ng/mL 30 - 300\nFerritin 62 ng/mL 30 - 300");
    expect(r.readings).toHaveLength(1);
    expect(byId(r, "ferritin")).toMatchObject({ value: 62, issues: [] });
  });

  it("parses the MM/DD/YYYY collection date", () => {
    expect(parseReportText("Collection Date: 08/26/2026").collectedOn).toBe("2026-08-26");
  });

  it("returns null date when absent", () => {
    expect(parseReportText("Ferritin 62 ng/mL 30 - 300").collectedOn).toBeNull();
  });

  it("parses sex-specific ranges", () => {
    const r = parseReportText("Ferritin  180  ng/mL  Female: 15 - 150; Male: 30 - 400");
    expect(byId(r, "ferritin").ranges).toEqual([
      { sex: "female", low: 15, high: 150, unit: "ng/mL" },
      { sex: "male", low: 30, high: 400, unit: "ng/mL" },
    ]);
  });

  it("parses one-sided and unspaced ranges and synonyms", () => {
    const r = parseReportText("Folate, Serum 6.5 ng/mL > 3.0\nCobalamin 354 pmol/L 148-664\nMagnesium, Serum 0.8 mmol/L < 1.1");
    expect(byId(r, "folate").ranges).toEqual([{ low: 3, high: null, unit: "ng/mL" }]);
    expect(byId(r, "b12")).toMatchObject({ unit: "pmol/L", ranges: [{ low: 148, high: 664, unit: "pmol/L" }] });
    expect(byId(r, "magnesium").ranges).toEqual([{ low: null, high: 1.1, unit: "mmol/L" }]);
  });

  it("flags unsupported units", () => {
    const r = parseReportText("Vitamin B12 354 mg/furlong 148 - 664");
    expect(byId(r, "b12").issues).toContain("unsupported_unit");
  });

  it("does not treat header/title lines as analytes", () => {
    expect(parseReportText("Patient: Synthetic Patient SP-1842\nTest Result Unit Reference range").unsupportedAnalytes).toEqual([]);
  });
});
