import type { BiomarkerId, ReferenceRange } from "./types";

export class UnsupportedUnitError extends Error {
  constructor(
    public readonly biomarkerId: BiomarkerId,
    public readonly unit: string,
  ) {
    super(`Unsupported unit "${unit}" for ${biomarkerId}`);
    this.name = "UnsupportedUnitError";
  }
}

const CANONICAL: Record<BiomarkerId, string> = {
  vitaminD: "ng/mL",
  b12: "pg/mL",
  folate: "ng/mL",
  ferritin: "ng/mL",
  magnesium: "mmol/L",
};

/** Multiplier from each accepted (normalized) unit to the canonical unit. */
const TO_CANONICAL: Record<BiomarkerId, Record<string, (v: number) => number>> = {
  vitaminD: { "ng/ml": (v) => v, "nmol/l": (v) => v / 2.496 },
  b12: { "pg/ml": (v) => v, "pmol/l": (v) => v * 1.355 },
  folate: { "ng/ml": (v) => v, "nmol/l": (v) => v / 2.266 },
  ferritin: { "ng/ml": (v) => v, "µg/l": (v) => v, "ug/l": (v) => v, "mcg/l": (v) => v },
  magnesium: { "mmol/l": (v) => v, "mg/dl": (v) => v * 0.4114, "meq/l": (v) => v * 0.5 },
};

function normalizeUnit(unit: string): string {
  return unit.replace(/\s+/g, "").toLowerCase().replace(/μ/g, "µ");
}

function converter(id: BiomarkerId, unit: string): ((v: number) => number) | undefined {
  const table = TO_CANONICAL[id];
  const key = normalizeUnit(unit);
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

export function isSupportedUnit(id: BiomarkerId, unit: string): boolean {
  return converter(id, unit) !== undefined;
}

export function toCanonical(id: BiomarkerId, value: number, unit: string): number {
  const fn = converter(id, unit);
  if (!fn) throw new UnsupportedUnitError(id, unit);
  return fn(value);
}

export function canonicalRange(id: BiomarkerId, range: ReferenceRange): ReferenceRange {
  const conv = (v: number | null) => (v === null ? null : toCanonical(id, v, range.unit));
  const out: ReferenceRange = { low: conv(range.low), high: conv(range.high), unit: CANONICAL[id] };
  if (range.sex !== undefined) out.sex = range.sex;
  return out;
}

export const iuToMcgVitaminD = (iu: number): number => iu / 40;
export const mcgToIuVitaminD = (mcg: number): number => mcg * 40;
