import {
  BIOMARKER_IDS,
  NUTRIENT_IDS,
  NUTRIENT_UNITS,
  type AssessmentInput,
  type BiomarkerId,
  type NutrientId,
} from "@/lib/domain/types";
import { normalizeSupplements } from "@/lib/domain/supplements";
import { iuToMcgVitaminD } from "@/lib/domain/units";
import { interpretBiomarkers } from "@/lib/engine/interpret";
import type { BiomarkerInterpretation, DoseProposal, ReviewReason } from "@/lib/engine/types";

export const PROTOTYPE_CEILINGS: Record<NutrientId, number> = {
  vitaminD: 2000,
  b12: 100,
  folicAcid: 400,
  magnesium: 200,
};

export const INGREDIENT_NAMES: Record<NutrientId, string> = {
  vitaminD: "Vitamin D3",
  b12: "Vitamin B12",
  folicAcid: "Folic acid",
  magnesium: "Magnesium (elemental)",
};

const NUTRIENT_BIOMARKER: Record<NutrientId, BiomarkerId> = {
  vitaminD: "vitaminD",
  b12: "b12",
  folicAcid: "folate",
  magnesium: "magnesium",
};

const LIMIT_LABEL = "prototype limit, not an established clinical upper limit";
const EPSILON = 1e-9;

export interface IngredientDecision {
  nutrient: NutrientId;
  ingredientName: string;
  unit: "IU" | "mcg" | "mg";
  status: "included" | "not_included" | "covered_by_existing" | "review_required" | "missing_data";
  proposedTotal: number | null;
  existingDaily: number;
  formulaAddition: number | null;
  combinedDaily: number | null;
  reasonCodes: string[];
  explanation: string;
}

export interface FormulationItem {
  nutrient: NutrientId;
  ingredientName: string;
  amount: number;
  unit: "IU" | "mcg" | "mg";
  secondary?: { amount: number; unit: "mcg" };
}

export interface AssessmentResult {
  engine: { id: string; version: string };
  policy: { id: string; version: string };
  status: "ready" | "review_required" | "incomplete";
  globalReview: boolean;
  globalReviewReasons: ReviewReason[];
  missingBiomarkers: BiomarkerId[];
  interpretations: BiomarkerInterpretation[];
  decisions: IngredientDecision[];
  formulation: { items: FormulationItem[] } | null;
  manufacturingAllowed: boolean;
}

function globalReviewReasons(input: AssessmentInput): ReviewReason[] {
  const { profile, supplements } = input;
  const out: ReviewReason[] = [];
  const add = (code: string, message: string) => out.push({ code, message });

  if (profile.age === null) {
    add("age_unknown", "Age was not provided. This prototype only proposes amounts for adults aged 18 to 65; a clinician should review.");
  } else if (profile.age < 18 || profile.age > 65) {
    add("age_out_of_scope", "This prototype only proposes amounts for adults aged 18 to 65; a clinician should review.");
  }
  if (profile.medications.status !== "none") {
    add(
      "medications_reported_or_unresolved",
      profile.medications.status === "some"
        ? "A medication was reported. This prototype does not propose amounts when medications are present; a clinician should review."
        : "Medication use is not confirmed. This prototype does not propose amounts until medications are explicitly reported as none; a clinician should review.",
    );
  }
  if (profile.medicalHistory.status !== "none") {
    add(
      "history_reported_or_unresolved",
      profile.medicalHistory.status === "some"
        ? "Medical history was reported. This prototype does not propose amounts in that case; a clinician should review."
        : "Medical history is not confirmed. This prototype does not propose amounts until it is explicitly reported as none; a clinician should review.",
    );
  }
  if (profile.pregnancy !== "no" && profile.pregnancy !== "not_applicable") {
    add(
      "pregnancy_unresolved",
      profile.pregnancy === "yes"
        ? "Pregnancy or breastfeeding was reported. This prototype does not propose amounts in that case; a clinician should review."
        : "Pregnancy or breastfeeding status is not confirmed. This prototype does not propose amounts until it is answered; a clinician should review.",
    );
  }
  if (profile.supplementsStatus === null || profile.supplementsStatus === "unknown") {
    add("supplements_unresolved", "Current supplement use is not confirmed, so existing intake cannot be accounted for; a clinician should review.");
  } else if (profile.supplementsStatus === "some" && supplements.length === 0) {
    add("supplements_missing_details", "Supplements were reported but none are listed, so existing intake cannot be accounted for; a clinician should review.");
  } else if (profile.supplementsStatus === "none" && supplements.length > 0) {
    add("supplements_inconsistent", "Supplements are listed although none were reported, so existing intake is unclear; a clinician should review.");
  }
  const { unresolved } = normalizeSupplements(supplements);
  if (unresolved.length > 0) {
    add(
      "supplement_details_unresolved",
      "At least one supplement has an unknown composition, amount, frequency or unit, so existing intake cannot be calculated; a clinician should review.",
    );
  }
  return out;
}

export class DemoSafetyPolicy {
  readonly id = "demo-safety-policy";
  readonly version = "1.0.0";

  evaluate(
    input: AssessmentInput,
    proposals: DoseProposal[],
    engine: { id: string; version: string } = { id: "unknown", version: "0" },
  ): AssessmentResult {
    const interpretations = interpretBiomarkers(input);
    const missingBiomarkers = BIOMARKER_IDS.filter(
      (id) => interpretations.find((i) => i.id === id)?.band === "missing",
    );
    const reasons = globalReviewReasons(input);
    const globalReview = reasons.length > 0;
    const { dailyTotals } = normalizeSupplements(input.supplements);

    const decisions = NUTRIENT_IDS.map((nutrient) =>
      this.decide(
        nutrient,
        interpretations.find((i) => i.id === NUTRIENT_BIOMARKER[nutrient])!,
        proposals.find((p) => p.nutrient === nutrient),
        dailyTotals[nutrient],
        globalReview,
      ),
    );

    const status: AssessmentResult["status"] = globalReview
      ? "review_required"
      : missingBiomarkers.length > 0
        ? "incomplete"
        : decisions.some((d) => d.status === "review_required") ||
            // Biomarkers with no dosed nutrient (ferritin) still hold the result for review.
            interpretations.some((i) => i.band.startsWith("review_"))
          ? "review_required"
          : "ready";

    const formulation =
      globalReview || missingBiomarkers.length > 0
        ? null
        : {
            items: decisions
              .filter((d) => d.status === "included")
              .map((d): FormulationItem => {
                const item: FormulationItem = {
                  nutrient: d.nutrient,
                  ingredientName: d.ingredientName,
                  amount: d.formulaAddition!,
                  unit: d.unit,
                };
                if (d.nutrient === "vitaminD") {
                  item.secondary = { amount: iuToMcgVitaminD(d.formulaAddition!), unit: "mcg" };
                }
                return item;
              }),
          };

    return {
      engine,
      policy: { id: this.id, version: this.version },
      status,
      globalReview,
      globalReviewReasons: reasons,
      missingBiomarkers,
      interpretations,
      decisions,
      formulation,
      manufacturingAllowed: status === "ready" && formulation !== null && formulation.items.length > 0,
    };
  }

  private decide(
    nutrient: NutrientId,
    interp: BiomarkerInterpretation,
    proposal: DoseProposal | undefined,
    existingDaily: number,
    globalReview: boolean,
  ): IngredientDecision {
    const unit = NUTRIENT_UNITS[nutrient];
    const ceiling = PROTOTYPE_CEILINGS[nutrient];
    const base = { nutrient, ingredientName: INGREDIENT_NAMES[nutrient], unit, existingDaily };
    const review = (codes: string[], explanation: string): IngredientDecision => ({
      ...base, status: "review_required", proposedTotal: null, formulaAddition: null, combinedDaily: null,
      reasonCodes: codes, explanation,
    });

    if (globalReview) {
      return review(["global_review"], "Held for review because of a profile or supplement answer; no amount is proposed.");
    }
    if (interp.band === "missing") {
      return {
        ...base, status: "missing_data", proposedTotal: null, formulaAddition: null, combinedDaily: null,
        reasonCodes: ["biomarker_missing"],
        explanation: `${interp.label} was not provided, so no ${INGREDIENT_NAMES[nutrient]} amount can be proposed.`,
      };
    }
    if (existingDaily > ceiling + EPSILON) {
      return review(
        ["existing_above_prototype_limit"],
        `Existing intake of about ${Math.round(existingDaily * 100) / 100} ${unit}/day is above the ${ceiling} ${unit} ${LIMIT_LABEL}. This is held for review; no change to the existing product is suggested.`,
      );
    }
    if (interp.band.startsWith("review_")) {
      return review(
        interp.reviewReasons.map((r) => r.code).concat(interp.reviewReasons.length ? [] : ["review"]),
        interp.reviewReasons.map((r) => r.message).join(" ") || `${interp.label} needs review.`,
      );
    }
    const rejected = (why: string) =>
      review(["engine_output_rejected"], `The proposed amount was rejected by the safety policy (${why}) and is held for review.`);

    if (!proposal) return rejected("no proposal was returned");
    if (proposal.unit !== unit) return rejected("unexpected unit");
    if (proposal.status === "review") {
      return review([proposal.reasonCode], proposal.explanation);
    }
    if (proposal.status === "missing") return rejected("engine reported missing data for an available biomarker");

    if (proposal.status === "no_addition") {
      if (interp.band !== "adequate" && interp.band !== "support") return rejected("band mismatch");
      return {
        ...base, status: "not_included", proposedTotal: null, formulaAddition: 0, combinedDaily: existingDaily,
        reasonCodes: [proposal.reasonCode], explanation: proposal.explanation,
      };
    }

    // status === "propose"
    if (interp.band !== "support") return rejected("a dose was proposed outside the support band");
    const total = proposal.proposedTotal;
    if (total === null || !Number.isFinite(total) || total < 0) return rejected("invalid amount");
    if (total > ceiling) return rejected(`above the ${ceiling} ${unit} ${LIMIT_LABEL}`);

    const addition = Math.round(Math.max(0, total - existingDaily));
    const common = { ...base, proposedTotal: total, formulaAddition: addition, combinedDaily: existingDaily + addition };
    if (addition === 0) {
      return {
        ...common, status: "covered_by_existing", reasonCodes: ["covered_by_existing"],
        explanation: `Existing intake of about ${Math.round(existingDaily * 100) / 100} ${unit}/day already reaches the proposed total of ${total} ${unit}, so nothing is added.`,
      };
    }
    return {
      ...common, status: "included", reasonCodes: [proposal.reasonCode],
      explanation: `${proposal.explanation} Existing intake of about ${Math.round(existingDaily * 100) / 100} ${unit}/day is subtracted, leaving an addition of ${addition} ${unit}.`,
    };
  }
}
