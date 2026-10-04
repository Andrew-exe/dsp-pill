import type { NutrientId } from "@/lib/domain/types";
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
