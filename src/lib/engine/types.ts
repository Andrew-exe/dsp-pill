import type { AssessmentInput, BiomarkerId, NutrientId } from "@/lib/domain/types";

export type PolicyBand =
  | "review_low"
  | "support"
  | "adequate"
  | "review_high"
  | "review_range"
  | "missing";

export interface ReviewReason {
  code: string;
  message: string;
}

export interface BiomarkerInterpretation {
  id: BiomarkerId;
  label: string;
  /** Value in the canonical unit, or null when the biomarker is absent. */
  value: number | null;
  unit: string;
  rawValue: number | null;
  rawUnit: string | null;
  labRange: { low: number | null; high: number | null; sex?: "female" | "male" } | null;
  labStatus: "below" | "within" | "above" | "no_range" | "ambiguous_range";
  demoBands: { band: PolicyBand; low: number | null; high: number | null; label: string }[];
  band: PolicyBand;
  reviewReasons: ReviewReason[];
  /** Prototype policy summary (fixed demonstration policy). */
  summary: string;
  /** General background context; separate from the prototype policy. */
  clinicalContext: string;
}

export interface DoseProposal {
  nutrient: NutrientId;
  biomarker: BiomarkerId;
  status: "propose" | "no_addition" | "review" | "missing";
  proposedTotal: number | null;
  unit: "IU" | "mcg" | "mg";
  reasonCode: string;
  explanation: string;
}

export interface DoseProposalEngine {
  readonly id: string;
  readonly version: string;
  propose(input: AssessmentInput): DoseProposal[];
}
