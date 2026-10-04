import { describe, expect, it } from "vitest";
import { normalizeSupplements } from "@/lib/domain/supplements";
import { AssessmentInputSchema, type SupplementEntry } from "@/lib/domain/types";

const d3 = (over: Partial<SupplementEntry> = {}): SupplementEntry => ({
  productId: "vitamin-d3",
  label: "Vitamin D3",
  amountPerDose: 400,
  unit: "IU",
  timesPerWeek: 7,
  ...over,
});

describe("normalizeSupplements", () => {
  it("returns all four nutrients as zero for no entries", () => {
    expect(normalizeSupplements([])).toEqual({
      dailyTotals: { vitaminD: 0, b12: 0, folicAcid: 0, magnesium: 0 },
      unresolved: [],
    });
  });
  it("handles daily IU, mcg conversion and weekly dosing", () => {
    expect(normalizeSupplements([d3()]).dailyTotals.vitaminD).toBe(400);
    expect(normalizeSupplements([d3({ amountPerDose: 10, unit: "mcg" })]).dailyTotals.vitaminD).toBe(400);
    expect(
      normalizeSupplements([d3({ amountPerDose: 50000, timesPerWeek: 1 })]).dailyTotals.vitaminD,
    ).toBeCloseTo(7142.86, 2);
  });
  it("sums duplicates", () => {
    expect(normalizeSupplements([d3(), d3()]).dailyTotals.vitaminD).toBe(800);
  });
  it("expands multivitamin servings and sums with other entries", () => {
    const mv: SupplementEntry = {
      productId: "multivitamin-basic",
      label: "Multi",
      amountPerDose: 1,
      unit: "serving",
      timesPerWeek: 7,
    };
    expect(normalizeSupplements([mv, d3()]).dailyTotals).toEqual({
      vitaminD: 800,
      b12: 6,
      folicAcid: 400,
      magnesium: 50,
    });
  });
  it("handles direct b12, folic acid and magnesium", () => {
    const e = (productId: SupplementEntry["productId"], amountPerDose: number, unit: SupplementEntry["unit"]) => ({
      productId,
      label: "x",
      amountPerDose,
      unit,
      timesPerWeek: 7,
    });
    const t = normalizeSupplements([
      e("vitamin-b12", 25, "mcg"),
      e("folic-acid", 400, "mcg"),
      e("magnesium-elemental", 100, "mg"),
    ]).dailyTotals;
    expect(t).toEqual({ vitaminD: 0, b12: 25, folicAcid: 400, magnesium: 100 });
  });
  it("flags unresolved entries and counts them as zero", () => {
    const r = normalizeSupplements([
      d3({ productId: "other" }),
      d3({ amountPerDose: null }),
      d3({ timesPerWeek: null }),
      d3({ unit: "mg" }),
    ]);
    expect(r.unresolved).toEqual([
      { index: 0, reason: "unknown_composition" },
      { index: 1, reason: "unknown_amount" },
      { index: 2, reason: "unknown_frequency" },
      { index: 3, reason: "unit_mismatch" },
    ]);
    expect(r.dailyTotals.vitaminD).toBe(0);
  });
});

describe("AssessmentInputSchema", () => {
  const profile = {
    age: 32,
    sex: "female",
    heightCm: 165,
    weightKg: 60,
    diet: "vegan",
    medications: { status: "none", details: "" },
    medicalHistory: { status: "none", details: "" },
    pregnancy: "no",
    supplementsStatus: "none",
  };
  const reading = (over: object = {}) => ({
    id: "vitaminD",
    value: 18,
    unit: "ng/mL",
    ranges: [{ low: 20, high: 50, unit: "ng/mL" }],
    source: "fixture",
    collectedOn: null,
    ...over,
  });
  it("accepts valid input", () => {
    expect(AssessmentInputSchema.safeParse({ biomarkers: [reading()], profile, supplements: [] }).success).toBe(true);
  });
  it("reports unsupported reading unit at its path", () => {
    const r = AssessmentInputSchema.safeParse({ biomarkers: [reading({ unit: "furlongs" })], profile, supplements: [] });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path)).toContainEqual(["biomarkers", 0, "unit"]);
  });
  it("reports unsupported range unit at its path", () => {
    const r = AssessmentInputSchema.safeParse({
      biomarkers: [reading({ ranges: [{ low: 1, high: 2, unit: "ng/mL" }, { low: 1, high: 2, unit: "furlongs" }] })],
      profile,
      supplements: [],
    });
    expect(r.error?.issues.map((i) => i.path)).toContainEqual(["biomarkers", 0, "ranges", 1, "unit"]);
  });
  it("rejects negative values", () => {
    expect(AssessmentInputSchema.safeParse({ biomarkers: [reading({ value: -1 })], profile, supplements: [] }).success).toBe(false);
  });
});
