import {
  BIOMARKER_IDS,
  CANONICAL_UNITS,
  type AssessmentInput,
  type BiomarkerId,
  type BiomarkerReading,
  type ReferenceRange,
} from "@/lib/domain/types";
import { canonicalRange, toCanonical } from "@/lib/domain/units";
import type { BiomarkerInterpretation, PolicyBand, ReviewReason } from "./types";

type Sex = "female" | "male" | "unknown" | null;
type Band = BiomarkerInterpretation["demoBands"][number];

const LABELS: Record<BiomarkerId, string> = {
  vitaminD: "25-OH Vitamin D",
  b12: "Vitamin B12",
  folate: "Folate",
  ferritin: "Ferritin",
  magnesium: "Magnesium",
};

const CONTEXT: Record<BiomarkerId, string> = {
  vitaminD:
    "General context (NIH Office of Dietary Supplements): serum 25-hydroxyvitamin D is the usual marker of vitamin D status, and it reflects intake from food, supplements and sun exposure. Interpretation depends on the person and the lab.",
  b12: "General context (NIH Office of Dietary Supplements): vegan diets contain little natural vitamin B12, and low serum B12 can have causes beyond diet that a clinician may want to assess.",
  folate:
    "General context (NIH Office of Dietary Supplements): folate status is interpreted together with vitamin B12, because folate intake can mask signs of B12 deficiency.",
  ferritin:
    "General context (NIH Office of Dietary Supplements): ferritin reflects iron stores but also rises with inflammation, so it is read with the lab's range and other results.",
  magnesium:
    "General context (NIH Office of Dietary Supplements): serum magnesium is a limited marker because most body magnesium is in bone and cells, so it does not establish whole-body stores.",
};

const POLICY_NOTE = "Fixed demonstration policy, not treatment advice.";

const DEMO_BANDS: Record<BiomarkerId, Band[]> = {
  vitaminD: [
    { band: "review_low", low: null, high: 12, label: "Below 12 ng/mL: review" },
    { band: "support", low: 12, high: 20, label: "12 to below 20 ng/mL: illustrative support" },
    { band: "adequate", low: 20, high: 50, label: "20 through 50 ng/mL: no addition" },
    { band: "review_high", low: 50, high: null, label: "Above 50 ng/mL: review" },
  ],
  b12: [
    { band: "review_low", low: null, high: 400, label: "Below 400 pg/mL: review" },
    { band: "support", low: 400, high: null, label: "400 pg/mL and above, within the lab range: dietary-support check" },
    { band: "review_high", low: null, high: null, label: "Above the lab range: review" },
  ],
  folate: [
    { band: "review_low", low: null, high: 3, label: "3 ng/mL or below: review" },
    { band: "support", low: 3, high: 4, label: "Above 3 through 4 ng/mL: illustrative support" },
    { band: "adequate", low: 4, high: null, label: "Above 4 ng/mL, within the lab range: no addition" },
    { band: "review_high", low: null, high: null, label: "Above the lab range: review" },
  ],
  ferritin: [
    { band: "review_low", low: null, high: 30, label: "Below 30 ng/mL: review" },
    { band: "adequate", low: 30, high: null, label: "30 ng/mL and above, within the lab range: iron not auto-included" },
    { band: "review_high", low: null, high: null, label: "Above the lab range: review" },
  ],
  magnesium: [
    { band: "review_low", low: null, high: 0.75, label: "Below 0.75 mmol/L: review" },
    { band: "support", low: 0.75, high: 0.8, label: "0.75 to below 0.80 mmol/L: illustrative support" },
    { band: "adequate", low: 0.8, high: null, label: "0.80 mmol/L and above, within the lab range: no addition" },
    { band: "review_high", low: null, high: null, label: "Above the lab range: review" },
  ],
};

/** Ruling 3: sex-matching range wins, else a range without sex; sex-specific-only with unknown sex is ambiguous (null). */
export function selectApplicableRange(ranges: ReferenceRange[], sex: Sex): ReferenceRange | null {
  if (sex === "female" || sex === "male") {
    const match = ranges.find((r) => r.sex === sex);
    if (match) return match;
  }
  return ranges.find((r) => r.sex === undefined) ?? null;
}

function isAmbiguous(ranges: ReferenceRange[], applicable: ReferenceRange | null, sex: Sex): boolean {
  // With a known sex, only the other sex's range is simply "no applicable range", not an ambiguity.
  return applicable === null && (sex === "unknown" || sex === null) && ranges.length > 0 && ranges.every((r) => r.sex !== undefined);
}

function labStatusOf(value: number, r: ReferenceRange): "below" | "within" | "above" {
  if (r.low !== null && value < r.low) return "below";
  if (r.high !== null && value > r.high) return "above";
  return "within";
}

interface Spec {
  /** review_low when value < lowBelow (or <= when lowInclusive). */
  lowBelow: number;
  lowInclusive?: boolean;
  lowCode: string;
  lowMessage: string;
  highCode: string;
  highMessage: string;
  /** Returns the policy band for an in-range value. */
  inRange(v: number): "support" | "adequate";
}

const SPECS: Partial<Record<BiomarkerId, Spec>> = {
  b12: {
    lowBelow: 400,
    lowCode: "b12_below_400",
    lowMessage: "Vitamin B12 is below 400 pg/mL, so further assessment may be needed before any addition.",
    highCode: "b12_above_range",
    highMessage: "Vitamin B12 is above the supplied lab range.",
    inRange: () => "support",
  },
  folate: {
    lowBelow: 3,
    lowInclusive: true,
    lowCode: "folate_at_or_below_3",
    lowMessage: "Folate is at or below 3 ng/mL.",
    highCode: "folate_high",
    highMessage: "Folate is above the supplied lab range.",
    inRange: (v) => (v <= 4 ? "support" : "adequate"),
  },
  ferritin: {
    lowBelow: 30,
    lowCode: "ferritin_below_30",
    lowMessage: "Ferritin is below 30 ng/mL.",
    highCode: "ferritin_above_range",
    highMessage: "Ferritin is above the supplied lab range.",
    inRange: () => "adequate",
  },
  magnesium: {
    lowBelow: 0.75,
    lowCode: "mg_below_075",
    lowMessage: "Serum magnesium is below 0.75 mmol/L.",
    highCode: "mg_above_range",
    highMessage: "Serum magnesium is above the supplied lab range.",
    inRange: (v) => (v < 0.8 ? "support" : "adequate"),
  },
};

const SUMMARIES: Record<PolicyBand, (label: string) => string> = {
  review_low: (l) => `${l} falls in a review band of the fixed demonstration policy; no dose is proposed.`,
  review_high: (l) => `${l} falls in a review band of the fixed demonstration policy; no dose is proposed.`,
  review_range: (l) => `${l} could not be placed in the demonstration policy against a usable lab range or dependency, so it is held for review.`,
  support: (l) => `${l} falls in the illustrative support band of the fixed demonstration policy.`,
  adequate: (l) => `${l} falls in the no-addition band of the fixed demonstration policy.`,
  missing: (l) => `${l} was not provided, so it cannot be interpreted.`,
};

export function interpretBiomarkers(input: AssessmentInput): BiomarkerInterpretation[] {
  const sex = input.profile.sex;
  const out: BiomarkerInterpretation[] = [];
  for (const id of BIOMARKER_IDS) {
    const reading = input.biomarkers.find((b) => b.id === id);
    out.push(interpretOne(id, reading, sex, out.find((o) => o.id === "b12")));
  }
  return out;
}

function interpretOne(
  id: BiomarkerId,
  reading: BiomarkerReading | undefined,
  sex: Sex,
  b12: BiomarkerInterpretation | undefined,
): BiomarkerInterpretation {
  const label = LABELS[id];
  const base = {
    id,
    label,
    unit: CANONICAL_UNITS[id],
    demoBands: DEMO_BANDS[id],
    clinicalContext: CONTEXT[id],
  };
  if (!reading) {
    return {
      ...base,
      value: null,
      rawValue: null,
      rawUnit: null,
      labRange: null,
      labStatus: "no_range",
      band: "missing",
      reviewReasons: [],
      summary: SUMMARIES.missing(label),
    };
  }

  const value = toCanonical(id, reading.value, reading.unit);
  const canonical = reading.ranges.map((r) => canonicalRange(id, r));
  const applicable = selectApplicableRange(canonical, sex);
  const ambiguous = isAmbiguous(canonical, applicable, sex);
  const labStatus = applicable ? labStatusOf(value, applicable) : ambiguous ? "ambiguous_range" : "no_range";
  const labRange = applicable
    ? { low: applicable.low, high: applicable.high, ...(applicable.sex ? { sex: applicable.sex } : {}) }
    : null;

  const reasons: ReviewReason[] = [];
  let band: PolicyBand;

  if (id === "vitaminD") {
    // Vitamin D bands use fixed policy thresholds only; the lab range is displayed, not used.
    if (value < 12) {
      band = "review_low";
      reasons.push({ code: "vitd_below_12", message: "25-OH Vitamin D is below 12 ng/mL." });
    } else if (value < 20) band = "support";
    else if (value <= 50) band = "adequate";
    else {
      band = "review_high";
      reasons.push({ code: "vitd_above_50", message: "25-OH Vitamin D is above 50 ng/mL." });
    }
  } else {
    const spec = SPECS[id]!;
    const isLow = spec.lowInclusive ? value <= spec.lowBelow : value < spec.lowBelow;
    const ranges = canonical;
    const rangeIssue = (): void => {
      if (ambiguous) {
        reasons.push({
          code: "ambiguous_sex_specific_range",
          message: "Only sex-specific lab ranges were supplied and sex is not known, so no range applies.",
        });
      } else if (!applicable) {
        reasons.push({ code: "no_applicable_range", message: ranges.length > 0 ? "The report has no reference range for the selected sex." : "No lab range was supplied for this result." });
      } else if (labStatus === "below") {
        reasons.push({ code: "below_lab_range", message: `${label} is below the supplied lab range.` });
      }
    };
    if (isLow) reasons.push({ code: spec.lowCode, message: spec.lowMessage });
    if (labStatus === "above") reasons.push({ code: spec.highCode, message: spec.highMessage });
    rangeIssue();

    // Folate relies on adequate B12 status (Ruling 2): anything but B12 support band fails.
    const depFails = id === "folate" && b12?.band !== "support";
    if (depFails) {
      reasons.push({
        code: "folate_b12_dependency",
        message:
          "Folate is only interpreted when vitamin B12 is at least 400 pg/mL and within its range; B12 is missing, low, out of range or without a usable range.",
      });
    }

    if (isLow) band = "review_low";
    else if (labStatus === "above") band = "review_high";
    else if (reasons.length > 0) band = "review_range";
    else band = spec.inRange(value);
  }

  let summary = SUMMARIES[band](label);
  if (reasons.length > 0) summary += ` Reasons: ${reasons.map((r) => r.message).join(" ")}`;
  if (id === "ferritin" && band === "adequate") {
    summary += " Iron is never automatically included in this MVP.";
  }
  if (id === "magnesium") {
    summary += " Serum magnesium does not establish whole-body stores.";
  }
  summary += ` ${POLICY_NOTE}`;

  return {
    ...base,
    value,
    rawValue: reading.value,
    rawUnit: reading.unit,
    labRange,
    labStatus,
    band,
    reviewReasons: reasons,
    summary,
  };
}
