import { describe, expect, it } from "vitest";
import { assess } from "@/lib/assess";
import { PRIMARY_PROFILE, PRIMARY_V1_BIOMARKERS, PRIMARY_SUPPLEMENTS, buildInput } from "@/fixtures/scenarios";
import type { Profile, SupplementEntry } from "@/lib/domain/types";
import type { DoseProposal, DoseProposalEngine } from "@/lib/engine/types";

const run = (profile: Partial<Profile> = {}, supplements: SupplementEntry[] = PRIMARY_SUPPLEMENTS, bio = PRIMARY_V1_BIOMARKERS) =>
  assess(buildInput(bio, { ...PRIMARY_PROFILE, ...profile }, supplements));
const dec = (r: ReturnType<typeof run>, n: string) => r.decisions.find((d) => d.nutrient === n)!;
const d3 = (amountPerDose: number, timesPerWeek = 7): SupplementEntry => ({
  productId: "vitamin-d3", label: "D3", amountPerDose, unit: "IU", timesPerWeek,
});

describe("global review gates", () => {
  const cases: [string, Partial<Profile>, SupplementEntry[]?][] = [
    ["age 17", { age: 17 }],
    ["age 66", { age: 66 }],
    ["age null", { age: null }],
    ["medications some", { medications: { status: "some", details: "x" } }],
    ["medications unknown", { medications: { status: "unknown", details: "" } }],
    ["history some", { medicalHistory: { status: "some", details: "x" } }],
    ["history null", { medicalHistory: { status: null, details: "" } }],
    ["pregnancy yes", { pregnancy: "yes" }],
    ["pregnancy unknown", { pregnancy: "unknown" }],
    ["supplements unknown", { supplementsStatus: "unknown" }],
    ["supplements some with none listed", { supplementsStatus: "some" }, []],
    ["supplement other", {}, [{ productId: "other", label: "x", amountPerDose: 1, unit: "mg", timesPerWeek: 7 }]],
    ["supplement amount null", {}, [{ ...d3(400), amountPerDose: null }]],
  ];
  it.each(cases)("%s", (_n, profile, supps) => {
    const r = run(profile, supps);
    expect(r.globalReview).toBe(true);
    expect(r.status).toBe("review_required");
    expect(r.manufacturingAllowed).toBe(false);
    expect(r.formulation).toBeNull();
    expect(r.interpretations).toHaveLength(5);
    expect(r.globalReviewReasons.length).toBeGreaterThan(0);
    for (const d of r.decisions) {
      expect(d.status).toBe("review_required");
      expect(d.formulaAddition).toBeNull();
      expect(d.combinedDaily).toBeNull();
    }
    const text = r.globalReviewReasons.map((x) => x.message).join(" ").toLowerCase();
    expect(text).not.toMatch(/\bsafe\b/);
  });

  it("ages 18 and 65 pass", () => {
    expect(run({ age: 18 }).globalReview).toBe(false);
    expect(run({ age: 65 }).globalReview).toBe(false);
  });
});

describe("overlap and ceilings", () => {
  it("existing D3 1000 IU daily is covered", () => {
    const r = run({}, [d3(1000)]);
    const d = dec(r, "vitaminD");
    expect(d.status).toBe("covered_by_existing");
    expect(d.formulaAddition).toBe(0);
    expect(r.formulation!.items.find((i) => i.nutrient === "vitaminD")).toBeUndefined();
  });
  it("existing at the ceiling is allowed", () => {
    const d = dec(run({}, [d3(2000)]), "vitaminD");
    expect(d.status).toBe("covered_by_existing");
  });
  it("50,000 IU weekly exceeds the prototype limit", () => {
    const r = run({}, [d3(50000, 1)]);
    const d = dec(r, "vitaminD");
    expect(d.status).toBe("review_required");
    expect(d.reasonCodes).toContain("existing_above_prototype_limit");
    expect(d.explanation).toContain("prototype limit, not an established clinical upper limit");
    expect(r.manufacturingAllowed).toBe(false);
  });
  it("multivitamin + vegan gives b12 addition 19", () => {
    const mv: SupplementEntry = { productId: "multivitamin-basic", label: "MV", amountPerDose: 1, unit: "serving", timesPerWeek: 7 };
    const d = dec(run({}, [mv]), "b12");
    expect(d.status).toBe("included");
    expect(d.formulaAddition).toBe(19);
  });
  it("existing B12 150 mcg daily needs review", () => {
    const b: SupplementEntry = { productId: "vitamin-b12", label: "B12", amountPerDose: 150, unit: "mcg", timesPerWeek: 7 };
    expect(dec(run({}, [b]), "b12").status).toBe("review_required");
  });
});

describe("independent validation", () => {
  const stub = (over: Partial<DoseProposal>): DoseProposalEngine => ({
    id: "stub", version: "0",
    propose: () => [
      { nutrient: "vitaminD", biomarker: "vitaminD", status: "propose", proposedTotal: 1000, unit: "IU", reasonCode: "x", explanation: "x", ...over },
    ],
  });
  it("rejects a total above the ceiling", () => {
    const r = assess(buildInput(PRIMARY_V1_BIOMARKERS), stub({ proposedTotal: 5000 }));
    const d = dec(r, "vitaminD");
    expect(d.status).toBe("review_required");
    expect(d.reasonCodes).toContain("engine_output_rejected");
  });
  it("rejects a wrong unit", () => {
    const d = dec(assess(buildInput(PRIMARY_V1_BIOMARKERS), stub({ unit: "mg" })), "vitaminD");
    expect(d.reasonCodes).toContain("engine_output_rejected");
  });
  it("treats missing proposals for other nutrients as rejected", () => {
    const r = assess(buildInput(PRIMARY_V1_BIOMARKERS), stub({}));
    expect(dec(r, "b12").reasonCodes).toContain("engine_output_rejected");
    expect(r.status).toBe("review_required");
  });
  it("forces review when the band is review even if the engine proposed a dose", () => {
    const bio = PRIMARY_V1_BIOMARKERS.map((b) => (b.id === "vitaminD" ? { ...b, value: 8 } : b));
    const d = dec(assess(buildInput(bio), stub({ proposedTotal: 1000 })), "vitaminD");
    expect(d.status).toBe("review_required");
    expect(d.formulaAddition).toBeNull();
  });
  it("rejects a dose proposed in the adequate band", () => {
    const bio = PRIMARY_V1_BIOMARKERS.map((b) => (b.id === "vitaminD" ? { ...b, value: 35 } : b));
    const d = dec(assess(buildInput(bio), stub({})), "vitaminD");
    expect(d.reasonCodes).toContain("engine_output_rejected");
  });
});

describe("missing biomarkers", () => {
  it("is incomplete with null formulation", () => {
    const r = run({}, PRIMARY_SUPPLEMENTS, PRIMARY_V1_BIOMARKERS.filter((b) => b.id !== "magnesium"));
    expect(r.status).toBe("incomplete");
    expect(r.missingBiomarkers).toEqual(["magnesium"]);
    expect(r.formulation).toBeNull();
    expect(r.interpretations).toHaveLength(5);
    expect(dec(r, "magnesium").status).toBe("missing_data");
    expect(r.manufacturingAllowed).toBe(false);
  });
});
