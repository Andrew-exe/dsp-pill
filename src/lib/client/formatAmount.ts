import type { BiomarkerId, NutrientId } from "@/lib/domain/types";
import { iuToMcgVitaminD } from "@/lib/domain/units";
import type { FormulationItem } from "@/lib/safety/policy";

const UNIT: Record<NutrientId, string> = { vitaminD: "IU", b12: "mcg", folicAcid: "mcg", magnesium: "mg" };

const num = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** The single place a formulation amount becomes text; every surface uses this. */
export function formatQuantity(nutrient: NutrientId, amount: number): string {
  if (nutrient === "vitaminD") return `${num(amount)} IU / ${num(iuToMcgVitaminD(amount))} mcg`;
  return `${num(amount)} ${UNIT[nutrient]}`;
}

export function formatItem(item: FormulationItem): string {
  return `${item.ingredientName} ${formatQuantity(item.nutrient, item.amount)}`;
}

/** The single place a biomarker reading or range limit becomes text; canonical floats never print raw. */
export function formatBiomarkerValue(id: BiomarkerId, value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: id === "magnesium" ? 2 : 1 });
}

export function formatBiomarkerRange(id: BiomarkerId, range: { low: number | null; high: number | null }): string {
  const low = range.low === null ? "no lower limit" : formatBiomarkerValue(id, range.low);
  const high = range.high === null ? "no upper limit" : formatBiomarkerValue(id, range.high);
  return `${low} to ${high}`;
}
