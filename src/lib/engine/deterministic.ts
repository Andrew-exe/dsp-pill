import { NUTRIENT_UNITS, type AssessmentInput, type BiomarkerId, type NutrientId } from "@/lib/domain/types";
import { interpretBiomarkers } from "./interpret";
import type { BiomarkerInterpretation, DoseProposal, DoseProposalEngine } from "./types";

const NUTRIENT_BIOMARKER: Record<NutrientId, BiomarkerId> = {
  vitaminD: "vitaminD",
  b12: "b12",
  folicAcid: "folate",
  magnesium: "magnesium",
};

const NUTRIENT_ORDER: NutrientId[] = ["vitaminD", "b12", "folicAcid", "magnesium"];

/** Fixed demonstration policy totals for the support band (not treatment advice). */
const SUPPORT_TOTAL: Record<NutrientId, number> = {
  vitaminD: 1000,
  b12: 25,
  folicAcid: 200,
  magnesium: 100,
};

const NAMES: Record<NutrientId, string> = {
  vitaminD: "Vitamin D",
  b12: "Vitamin B12",
  folicAcid: "Folic acid",
  magnesium: "Elemental magnesium",
};

export class DeterministicDoseEngine implements DoseProposalEngine {
  readonly id = "deterministic-rules";
  readonly version = "1.0.0";

  propose(input: AssessmentInput): DoseProposal[] {
    const interps = interpretBiomarkers(input);
    return NUTRIENT_ORDER.map((nutrient) => {
      const interp = interps.find((i) => i.id === NUTRIENT_BIOMARKER[nutrient])!;
      return this.forNutrient(nutrient, interp, input.profile.diet);
    });
  }

  private forNutrient(
    nutrient: NutrientId,
    interp: BiomarkerInterpretation,
    diet: AssessmentInput["profile"]["diet"],
  ): DoseProposal {
    const unit = NUTRIENT_UNITS[nutrient];
    const mk = (
      status: DoseProposal["status"],
      proposedTotal: number | null,
      reasonCode: string,
      explanation: string,
    ): DoseProposal => ({ nutrient, biomarker: interp.id, status, proposedTotal, unit, reasonCode, explanation });
    const name = NAMES[nutrient];

    switch (interp.band) {
      case "missing":
        return mk("missing", null, "biomarker_missing", `${interp.label} was not provided, so no ${name} amount can be proposed.`);
      case "adequate":
        return mk("no_addition", null, "band_adequate", `${interp.label} is in the no-addition band of the fixed demonstration policy.`);
      case "support": {
        if (nutrient === "b12") {
          if (diet === "vegan") {
            return mk(
              "propose",
              SUPPORT_TOTAL.b12,
              "b12_vegan_dietary_support",
              "Vitamin B12 is within range and the diet is vegan, so the fixed demonstration policy proposes an illustrative 25 mcg dietary-support total.",
            );
          }
          if (diet === null) {
            return mk("review", null, "diet_unknown", "Diet was not provided, so the vitamin B12 policy cannot be applied and the result is held for review.");
          }
          return mk("no_addition", null, "b12_no_dietary_support_needed", "Vitamin B12 is within range and the diet is not vegan, so the fixed demonstration policy adds nothing.");
        }
        return mk(
          "propose",
          SUPPORT_TOTAL[nutrient],
          `${nutrient}_support_band`,
          `${interp.label} is in the illustrative support band, so the fixed demonstration policy proposes a total of ${SUPPORT_TOTAL[nutrient]} ${unit}.`,
        );
      }
      default: {
        const first = interp.reviewReasons[0];
        return mk(
          "review",
          null,
          first?.code ?? "review",
          `${interp.label} needs review under the fixed demonstration policy; no ${name} amount is proposed. ${interp.reviewReasons.map((r) => r.message).join(" ")}`.trim(),
        );
      }
    }
  }
}
