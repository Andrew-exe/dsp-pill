import { z } from "zod";
import { isSupportedUnit } from "./units";

export const BIOMARKER_IDS = ["vitaminD", "b12", "folate", "ferritin", "magnesium"] as const;
export const BiomarkerIdSchema = z.enum(BIOMARKER_IDS);
export type BiomarkerId = z.infer<typeof BiomarkerIdSchema>;

export const NUTRIENT_IDS = ["vitaminD", "b12", "folicAcid", "magnesium"] as const;
export const NutrientIdSchema = z.enum(NUTRIENT_IDS);
export type NutrientId = z.infer<typeof NutrientIdSchema>;

export const CANONICAL_UNITS: Record<BiomarkerId, string> = {
  vitaminD: "ng/mL",
  b12: "pg/mL",
  folate: "ng/mL",
  ferritin: "ng/mL",
  magnesium: "mmol/L",
};

export const NUTRIENT_UNITS: Record<NutrientId, "IU" | "mcg" | "mg"> = {
  vitaminD: "IU",
  b12: "mcg",
  folicAcid: "mcg",
  magnesium: "mg",
};

export const ReferenceRangeSchema = z.object({
  low: z.number().finite().nullable(),
  high: z.number().finite().nullable(),
  unit: z.string(),
  sex: z.enum(["female", "male"]).optional(),
});
export type ReferenceRange = z.infer<typeof ReferenceRangeSchema>;

export const BiomarkerReadingSchema = z.object({
  id: BiomarkerIdSchema,
  value: z.number().finite().min(0),
  unit: z.string(),
  ranges: z.array(ReferenceRangeSchema),
  source: z.enum(["pdf", "manual", "fixture"]),
  collectedOn: z.string().nullable(),
});
export type BiomarkerReading = z.infer<typeof BiomarkerReadingSchema>;

const StatusSchema = z.enum(["none", "some", "unknown"]).nullable();

export const ProfileSchema = z.object({
  age: z.number().finite().nullable(),
  sex: z.enum(["female", "male", "unknown"]).nullable(),
  heightCm: z.number().finite().nullable(),
  weightKg: z.number().finite().nullable(),
  diet: z.enum(["omnivore", "vegetarian", "vegan", "other"]).nullable(),
  medications: z.object({ status: StatusSchema, details: z.string() }),
  medicalHistory: z.object({ status: StatusSchema, details: z.string() }),
  pregnancy: z.enum(["no", "yes", "unknown", "not_applicable"]).nullable(),
  supplementsStatus: StatusSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;

export const SUPPLEMENT_PRODUCT_IDS = [
  "vitamin-d3",
  "vitamin-b12",
  "folic-acid",
  "magnesium-elemental",
  "multivitamin-basic",
] as const;
export const SupplementProductIdSchema = z.enum(SUPPLEMENT_PRODUCT_IDS);
export type SupplementProductId = z.infer<typeof SupplementProductIdSchema>;

export const SupplementEntrySchema = z.object({
  productId: z.union([SupplementProductIdSchema, z.literal("other")]),
  label: z.string(),
  amountPerDose: z.number().finite().min(0).nullable(),
  unit: z.enum(["IU", "mcg", "mg", "serving"]),
  timesPerWeek: z.number().finite().min(0).nullable(),
});
export type SupplementEntry = z.infer<typeof SupplementEntrySchema>;

export const AssessmentInputSchema = z
  .object({
    biomarkers: z.array(BiomarkerReadingSchema),
    profile: ProfileSchema,
    supplements: z.array(SupplementEntrySchema),
  })
  .superRefine((input, ctx) => {
    input.biomarkers.forEach((reading, i) => {
      if (!isSupportedUnit(reading.id, reading.unit)) {
        ctx.addIssue({
          code: "custom",
          message: `Unsupported unit "${reading.unit}" for ${reading.id}`,
          path: ["biomarkers", i, "unit"],
        });
      }
      reading.ranges.forEach((range, j) => {
        if (!isSupportedUnit(reading.id, range.unit)) {
          ctx.addIssue({
            code: "custom",
            message: `Unsupported range unit "${range.unit}" for ${reading.id}`,
            path: ["biomarkers", i, "ranges", j, "unit"],
          });
        }
      });
    });
  });
export type AssessmentInput = z.infer<typeof AssessmentInputSchema>;
