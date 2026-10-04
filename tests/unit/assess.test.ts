import { describe, expect, it } from "vitest";
import { assess } from "@/lib/assess";
import {
  FOLLOWUP_V2_BIOMARKERS,
  PRIMARY_PROFILE,
  PRIMARY_V1_BIOMARKERS,
  SCENARIO_B_BIOMARKERS,
  buildInput,
} from "@/fixtures/scenarios";

describe("assess", () => {
  it("primary v1 is ready with the expected formula", () => {
    const r = assess(buildInput(PRIMARY_V1_BIOMARKERS));
    expect(r.status).toBe("ready");
    expect(r.manufacturingAllowed).toBe(true);
    expect(r.formulation!.items).toEqual([
      { nutrient: "vitaminD", ingredientName: "Vitamin D3", amount: 600, unit: "IU", secondary: { amount: 15, unit: "mcg" } },
      { nutrient: "b12", ingredientName: "Vitamin B12", amount: 25, unit: "mcg" },
      { nutrient: "magnesium", ingredientName: "Magnesium (elemental)", amount: 100, unit: "mg" },
    ]);
    const d = r.decisions.find((x) => x.nutrient === "vitaminD")!;
    expect(d.existingDaily).toBe(400);
    expect(d.combinedDaily).toBe(1000);
    expect(r.decisions.find((x) => x.nutrient === "folicAcid")!.status).toBe("not_included");
    expect(r.interpretations).toHaveLength(5);
  });

  it("follow-up v2 contains only B12 25 mcg", () => {
    const r = assess(buildInput(FOLLOWUP_V2_BIOMARKERS));
    expect(r.formulation!.items).toEqual([{ nutrient: "b12", ingredientName: "Vitamin B12", amount: 25, unit: "mcg" }]);
    expect(r.status).toBe("ready");
  });

  it("scenario B with female sex needs review but keeps the non-review items", () => {
    const r = assess(buildInput(SCENARIO_B_BIOMARKERS));
    expect(r.status).toBe("review_required");
    expect(r.manufacturingAllowed).toBe(false);
    expect(r.formulation!.items.map((i) => i.nutrient)).toEqual(["vitaminD", "b12", "magnesium"]);
  });

  it("scenario B with male sex is ready", () => {
    const r = assess(buildInput(SCENARIO_B_BIOMARKERS, { ...PRIMARY_PROFILE, sex: "male" }));
    expect(r.status).toBe("ready");
    expect(r.manufacturingAllowed).toBe(true);
  });

  it("carries engine and policy identity", () => {
    const r = assess(buildInput(PRIMARY_V1_BIOMARKERS));
    expect(r.engine).toEqual({ id: "deterministic-rules", version: "1.0.0" });
    expect(r.policy).toEqual({ id: "demo-safety-policy", version: "1.0.0" });
  });
});
