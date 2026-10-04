import type { AssessmentInput, BiomarkerId, BiomarkerReading, Profile, SupplementEntry } from "@/lib/domain/types";

/** Synthetic fixtures only. */
export const PRIMARY_PROFILE: Profile = {
  age: 32,
  sex: "female",
  heightCm: 165,
  weightKg: 60,
  diet: "vegan",
  medications: { status: "none", details: "" },
  medicalHistory: { status: "none", details: "" },
  pregnancy: "no",
  supplementsStatus: "some",
};

export const PRIMARY_SUPPLEMENTS: SupplementEntry[] = [
  { productId: "vitamin-d3", label: "Vitamin D3", amountPerDose: 400, unit: "IU", timesPerWeek: 7 },
];

const UNITS: Record<BiomarkerId, string> = {
  vitaminD: "ng/mL",
  b12: "pg/mL",
  folate: "ng/mL",
  ferritin: "ng/mL",
  magnesium: "mmol/L",
};

const RANGES: Record<BiomarkerId, [number, number]> = {
  vitaminD: [20, 50],
  b12: [200, 900],
  folate: [3.0, 20.0],
  ferritin: [30, 300],
  magnesium: [0.75, 0.95],
};

function reading(
  id: BiomarkerId,
  value: number,
  collectedOn: string,
  ranges: BiomarkerReading["ranges"] = [{ low: RANGES[id][0], high: RANGES[id][1], unit: UNITS[id] }],
): BiomarkerReading {
  return { id, value, unit: UNITS[id], ranges, source: "fixture", collectedOn };
}

const V1_VALUES: Record<BiomarkerId, number> = { vitaminD: 18, b12: 480, folate: 6.5, ferritin: 62, magnesium: 0.78 };
const V2_VALUES: Record<BiomarkerId, number> = { vitaminD: 28, b12: 520, folate: 7.2, ferritin: 65, magnesium: 0.85 };
const IDS = Object.keys(V1_VALUES) as BiomarkerId[];

export const PRIMARY_V1_BIOMARKERS: BiomarkerReading[] = IDS.map((id) => reading(id, V1_VALUES[id], "2026-07-01"));
export const FOLLOWUP_V2_BIOMARKERS: BiomarkerReading[] = IDS.map((id) => reading(id, V2_VALUES[id], "2026-08-26"));

export const SCENARIO_B_BIOMARKERS: BiomarkerReading[] = IDS.map((id) =>
  id === "ferritin"
    ? reading(id, 180, "2026-07-01", [
        { low: 15, high: 150, unit: UNITS.ferritin, sex: "female" },
        { low: 30, high: 400, unit: UNITS.ferritin, sex: "male" },
      ])
    : reading(id, V1_VALUES[id], "2026-07-01"),
);

export function buildInput(
  biomarkers: BiomarkerReading[],
  profile: Profile = PRIMARY_PROFILE,
  supplements: SupplementEntry[] = PRIMARY_SUPPLEMENTS,
): AssessmentInput {
  return { biomarkers, profile, supplements };
}
