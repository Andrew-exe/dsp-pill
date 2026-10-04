import { describe, expect, it } from "vitest";
import { interpretBiomarkers } from "@/lib/engine/interpret";
import type { AssessmentInput, BiomarkerId, ReferenceRange } from "@/lib/domain/types";

const R = (low: number | null, high: number | null, unit: string, sex?: "female" | "male"): ReferenceRange =>
  sex ? { low, high, unit, sex } : { low, high, unit };

const RANGES: Record<BiomarkerId, ReferenceRange[]> = {
  vitaminD: [R(20, 50, "ng/mL")],
  b12: [R(200, 900, "pg/mL")],
  folate: [R(3, 20, "ng/mL")],
  ferritin: [R(30, 300, "ng/mL")],
  magnesium: [R(0.75, 0.95, "mmol/L")],
};
const UNITS: Record<BiomarkerId, string> = {
  vitaminD: "ng/mL",
  b12: "pg/mL",
  folate: "ng/mL",
  ferritin: "ng/mL",
  magnesium: "mmol/L",
};

type Vals = Partial<Record<BiomarkerId, number>>;

function build(
  vals: Vals,
  opts: { sex?: "female" | "male" | "unknown" | null; ranges?: Partial<Record<BiomarkerId, ReferenceRange[]>>; units?: Partial<Record<BiomarkerId, string>> } = {},
): AssessmentInput {
  const full: Vals = { vitaminD: 30, b12: 500, folate: 6, ferritin: 100, magnesium: 0.85, ...vals };
  const biomarkers = (Object.keys(full) as BiomarkerId[])
    .filter((id) => full[id] !== undefined && !(id in vals && vals[id] === undefined))
    .map((id) => ({
      id,
      value: full[id] as number,
      unit: opts.units?.[id] ?? UNITS[id],
      ranges: opts.ranges?.[id] ?? RANGES[id],
      source: "manual" as const,
      collectedOn: null,
    }));
  return {
    biomarkers,
    profile: {
      age: 32,
      sex: opts.sex === undefined ? "female" : opts.sex,
      heightCm: 165,
      weightKg: 60,
      diet: "vegan",
      medications: { status: "none", details: "" },
      medicalHistory: { status: "none", details: "" },
      pregnancy: "no",
      supplementsStatus: "none",
    },
    supplements: [],
  };
}

const get = (input: AssessmentInput, id: BiomarkerId) => interpretBiomarkers(input).find((i) => i.id === id)!;
const band = (id: BiomarkerId, v: number, opts?: Parameters<typeof build>[1], extra: Vals = {}) =>
  get(build({ [id]: v, ...extra }, opts), id).band;

describe("interpretBiomarkers", () => {
  it("returns five entries in order", () => {
    expect(interpretBiomarkers(build({})).map((i) => i.id)).toEqual(["vitaminD", "b12", "folate", "ferritin", "magnesium"]);
  });

  it("vitamin D boundaries", () => {
    expect(band("vitaminD", 11.99)).toBe("review_low");
    expect(band("vitaminD", 12)).toBe("support");
    expect(band("vitaminD", 19.99)).toBe("support");
    expect(band("vitaminD", 20)).toBe("adequate");
    expect(band("vitaminD", 50)).toBe("adequate");
    expect(band("vitaminD", 50.01)).toBe("review_high");
    expect(band("vitaminD", 45, { units: { vitaminD: "nmol/L" } })).toBe("support");
  });

  it("vitamin D ignores the lab range", () => {
    expect(band("vitaminD", 15, { ranges: { vitaminD: [] } })).toBe("support");
  });

  it("b12 boundaries", () => {
    expect(band("b12", 399.9)).toBe("review_low");
    expect(band("b12", 400)).toBe("support");
    expect(band("b12", 900)).toBe("support");
    expect(band("b12", 901)).toBe("review_high");
    const none = get(build({ b12: 480 }, { ranges: { b12: [] } }), "b12");
    expect(none.band).toBe("review_range");
    expect(none.reviewReasons.map((r) => r.code)).toContain("no_applicable_range");
    expect(get(build({ b12: 399.9 }), "b12").summary).toContain("further assessment may be needed");
  });

  it("folate boundaries", () => {
    expect(band("folate", 3)).toBe("review_low");
    expect(band("folate", 3.01)).toBe("support");
    expect(band("folate", 4)).toBe("support");
    expect(band("folate", 4.01)).toBe("adequate");
    expect(band("folate", 20.5)).toBe("review_high");
    expect(get(build({ folate: 20.5 }), "folate").reviewReasons.map((r) => r.code)).toContain("folate_high");
  });

  it("folate B12 dependency", () => {
    const low = get(build({ folate: 6.5, b12: 350 }), "folate");
    expect(low.band).toBe("review_range");
    expect(low.reviewReasons.map((r) => r.code)).toEqual(["folate_b12_dependency"]);
    const absent = get(build({ folate: 6.5, b12: undefined }), "folate");
    expect(absent.band).toBe("review_range");
    expect(absent.reviewReasons.map((r) => r.code)).toContain("folate_b12_dependency");
    const outOfRange = get(build({ folate: 6.5, b12: 950 }), "folate");
    expect(outOfRange.reviewReasons.map((r) => r.code)).toContain("folate_b12_dependency");
    expect(get(build({ folate: 6.5, b12: 500 }), "folate").band).toBe("adequate");
  });

  it("folate value-based bands take precedence and accumulate reasons", () => {
    const f = get(build({ folate: 3, b12: 350 }), "folate");
    expect(f.band).toBe("review_low");
    expect(f.reviewReasons.map((r) => r.code)).toEqual(["folate_at_or_below_3", "folate_b12_dependency"]);
    expect(get(build({ folate: 3.5, b12: 350 }), "folate").band).toBe("review_range");
  });

  it("ferritin boundaries", () => {
    expect(band("ferritin", 29.9)).toBe("review_low");
    expect(band("ferritin", 30)).toBe("adequate");
    expect(band("ferritin", 301)).toBe("review_high");
    expect(get(build({ ferritin: 62 }), "ferritin").summary).toContain("Iron is never automatically included");
  });

  it("ferritin sex-specific ranges (scenario B)", () => {
    const ranges = { ferritin: [R(15, 150, "ng/mL", "female"), R(30, 400, "ng/mL", "male")] };
    expect(band("ferritin", 180, { sex: "female", ranges })).toBe("review_high");
    expect(band("ferritin", 180, { sex: "male", ranges })).toBe("adequate");
    for (const sex of ["unknown", null] as const) {
      const f = get(build({ ferritin: 180 }, { sex, ranges }), "ferritin");
      expect(f.band).toBe("review_range");
      expect(f.labStatus).toBe("ambiguous_range");
      expect(f.labRange).toBeNull();
      expect(f.reviewReasons.map((r) => r.code)).toContain("ambiguous_sex_specific_range");
    }
  });

  it("known sex with only the other sex's range is no_applicable_range, not ambiguous", () => {
    const ranges = { ferritin: [R(15, 150, "ng/mL", "female")] };
    const f = get(build({ ferritin: 80 }, { sex: "male", ranges }), "ferritin");
    expect(f.band).toBe("review_range");
    expect(f.labStatus).toBe("no_range");
    const reasons = f.reviewReasons;
    expect(reasons.map((r) => r.code)).toContain("no_applicable_range");
    expect(reasons.map((r) => r.code)).not.toContain("ambiguous_sex_specific_range");
    expect(reasons.find((r) => r.code === "no_applicable_range")?.message).toMatch(/selected sex/);
  });

  it("generic range wins over nothing but sex-specific wins when matching", () => {
    const ranges = { ferritin: [R(30, 300, "ng/mL"), R(15, 150, "ng/mL", "female")] };
    expect(get(build({ ferritin: 180 }, { sex: "female", ranges }), "ferritin").labRange?.sex).toBe("female");
    expect(get(build({ ferritin: 180 }, { sex: "unknown", ranges }), "ferritin").band).toBe("adequate");
  });

  it("below lab range is review_range; bounds are inclusive; null bound is unbounded", () => {
    const f = get(build({ ferritin: 40 }, { ranges: { ferritin: [R(50, 300, "ng/mL")] } }), "ferritin");
    expect(f.band).toBe("review_range");
    expect(f.labStatus).toBe("below");
    expect(f.reviewReasons.map((r) => r.code)).toEqual(["below_lab_range"]);
    expect(band("ferritin", 300)).toBe("adequate");
    expect(band("ferritin", 5000, { ranges: { ferritin: [R(30, null, "ng/mL")] } })).toBe("adequate");
  });

  it("magnesium boundaries", () => {
    expect(band("magnesium", 0.7499)).toBe("review_low");
    expect(band("magnesium", 0.75)).toBe("support");
    expect(band("magnesium", 0.7999)).toBe("support");
    expect(band("magnesium", 0.8)).toBe("adequate");
    expect(band("magnesium", 0.96)).toBe("review_high");
    expect(get(build({ magnesium: 0.78 }), "magnesium").summary).toContain("does not establish whole-body stores");
  });

  it("absent biomarker is missing", () => {
    const f = get(build({ ferritin: undefined }), "ferritin");
    expect(f.band).toBe("missing");
    expect(f.value).toBeNull();
    expect(f.rawValue).toBeNull();
    expect(f.labStatus).toBe("no_range");
  });

  it("never calls a result safe and separates context from policy", () => {
    for (const i of interpretBiomarkers(build({}))) {
      expect(i.summary.toLowerCase()).not.toMatch(/\bsafe\b/);
      expect(i.clinicalContext).not.toBe(i.summary);
    }
  });
});
