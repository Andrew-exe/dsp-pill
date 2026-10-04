import { describe, expect, it } from "vitest";
import { DeterministicDoseEngine } from "@/lib/engine/deterministic";
import type { AssessmentInput, BiomarkerId } from "@/lib/domain/types";

const U: Record<BiomarkerId, [string, [number, number]]> = {
  vitaminD: ["ng/mL", [20, 50]],
  b12: ["pg/mL", [200, 900]],
  folate: ["ng/mL", [3, 20]],
  ferritin: ["ng/mL", [30, 300]],
  magnesium: ["mmol/L", [0.75, 0.95]],
};

function primary(over: { diet?: AssessmentInput["profile"]["diet"]; folate?: number } = {}): AssessmentInput {
  const vals: Record<BiomarkerId, number> = { vitaminD: 18, b12: 480, folate: over.folate ?? 6.5, ferritin: 62, magnesium: 0.78 };
  return {
    biomarkers: (Object.keys(vals) as BiomarkerId[]).map((id) => ({
      id,
      value: vals[id],
      unit: U[id][0],
      ranges: [{ low: U[id][1][0], high: U[id][1][1], unit: U[id][0] }],
      source: "fixture" as const,
      collectedOn: "2026-07-01",
    })),
    profile: {
      age: 32, sex: "female", heightCm: 165, weightKg: 60,
      diet: over.diet === undefined ? "vegan" : over.diet,
      medications: { status: "none", details: "" },
      medicalHistory: { status: "none", details: "" },
      pregnancy: "no",
      supplementsStatus: "some",
    },
    supplements: [{ productId: "vitamin-d3", label: "Vitamin D3", amountPerDose: 400, unit: "IU", timesPerWeek: 7 }],
  };
}

const engine = new DeterministicDoseEngine();
const by = (p: ReturnType<typeof engine.propose>, n: string) => p.find((x) => x.nutrient === n)!;

describe("DeterministicDoseEngine", () => {
  it("identifies itself", () => {
    expect(engine.id).toBe("deterministic-rules");
    expect(engine.version).toBe("1.0.0");
  });

  it("primary fixture proposals, in nutrient order", () => {
    const p = engine.propose(primary());
    expect(p.map((x) => x.nutrient)).toEqual(["vitaminD", "b12", "folicAcid", "magnesium"]);
    expect(by(p, "vitaminD")).toMatchObject({ status: "propose", proposedTotal: 1000, unit: "IU", biomarker: "vitaminD" });
    expect(by(p, "b12")).toMatchObject({ status: "propose", proposedTotal: 25, unit: "mcg", reasonCode: "b12_vegan_dietary_support" });
    expect(by(p, "folicAcid")).toMatchObject({ status: "no_addition", proposedTotal: null, biomarker: "folate" });
    expect(by(p, "magnesium")).toMatchObject({ status: "propose", proposedTotal: 100, unit: "mg" });
  });

  it("b12 depends on diet", () => {
    expect(by(engine.propose(primary({ diet: "omnivore" })), "b12")).toMatchObject({ status: "no_addition", proposedTotal: null });
    const unknown = by(engine.propose(primary({ diet: null })), "b12");
    expect(unknown).toMatchObject({ status: "review", proposedTotal: null, reasonCode: "diet_unknown" });
  });

  it("an explicit Unknown diet is treated like a blank diet", () => {
    const unknown = by(engine.propose(primary({ diet: "unknown" })), "b12");
    expect(unknown).toMatchObject({ status: "review", proposedTotal: null, reasonCode: "diet_unknown" });
  });

  it("folate support proposes 200 mcg folic acid", () => {
    expect(by(engine.propose(primary({ folate: 3.5 })), "folicAcid")).toMatchObject({ status: "propose", proposedTotal: 200, unit: "mcg" });
  });

  it("review and missing statuses carry null totals", () => {
    const low = primary({ folate: 2 });
    expect(by(engine.propose(low), "folicAcid")).toMatchObject({ status: "review", proposedTotal: null, reasonCode: "folate_at_or_below_3" });
    const missing = primary();
    missing.biomarkers = missing.biomarkers.filter((b) => b.id !== "magnesium");
    expect(by(engine.propose(missing), "magnesium")).toMatchObject({ status: "missing", proposedTotal: null });
  });
});
