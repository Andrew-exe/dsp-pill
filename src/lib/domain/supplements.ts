import { mcgToIuVitaminD } from "./units";
import {
  NUTRIENT_IDS,
  type NutrientId,
  type SupplementEntry,
  type SupplementProductId,
} from "./types";

export interface CatalogItem {
  label: string;
  /** Nutrient amounts per one "serving", or "direct" when the entry amount is the nutrient amount. */
  perUnit: Partial<Record<NutrientId, number>> | "direct";
  directNutrient?: NutrientId;
  allowedUnits: SupplementEntry["unit"][];
}

export const SUPPLEMENT_CATALOG: Record<SupplementProductId, CatalogItem> = {
  "vitamin-d3": { label: "Vitamin D3", perUnit: "direct", directNutrient: "vitaminD", allowedUnits: ["IU", "mcg"] },
  "vitamin-b12": { label: "Vitamin B12", perUnit: "direct", directNutrient: "b12", allowedUnits: ["mcg"] },
  "folic-acid": { label: "Folic acid", perUnit: "direct", directNutrient: "folicAcid", allowedUnits: ["mcg"] },
  "magnesium-elemental": {
    label: "Magnesium (elemental)",
    perUnit: "direct",
    directNutrient: "magnesium",
    allowedUnits: ["mg"],
  },
  "multivitamin-basic": {
    label: "Basic multivitamin",
    perUnit: { vitaminD: 400, b12: 6, folicAcid: 400, magnesium: 50 },
    allowedUnits: ["serving"],
  },
};

export type UnresolvedReason = "unknown_composition" | "unknown_amount" | "unknown_frequency" | "unit_mismatch";

export function normalizeSupplements(entries: SupplementEntry[]): {
  dailyTotals: Record<NutrientId, number>;
  unresolved: { index: number; reason: UnresolvedReason }[];
} {
  const dailyTotals = Object.fromEntries(NUTRIENT_IDS.map((n) => [n, 0])) as Record<NutrientId, number>;
  const unresolved: { index: number; reason: UnresolvedReason }[] = [];

  entries.forEach((entry, index) => {
    const fail = (reason: UnresolvedReason) => unresolved.push({ index, reason });
    if (entry.productId === "other") return fail("unknown_composition");
    if (entry.amountPerDose === null) return fail("unknown_amount");
    if (entry.timesPerWeek === null) return fail("unknown_frequency");
    const item = SUPPLEMENT_CATALOG[entry.productId];
    if (!item.allowedUnits.includes(entry.unit)) return fail("unit_mismatch");

    const dosesPerDay = entry.timesPerWeek / 7;
    if (item.perUnit === "direct") {
      const nutrient = item.directNutrient!;
      const amount =
        nutrient === "vitaminD" && entry.unit === "mcg" ? mcgToIuVitaminD(entry.amountPerDose) : entry.amountPerDose;
      dailyTotals[nutrient] += amount * dosesPerDay;
    } else {
      for (const [nutrient, per] of Object.entries(item.perUnit) as [NutrientId, number][]) {
        dailyTotals[nutrient] += per * entry.amountPerDose * dosesPerDay;
      }
    }
  });

  return { dailyTotals, unresolved };
}
