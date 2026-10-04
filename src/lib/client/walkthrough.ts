import type { StageId } from "@/components/shell/StageNav";
import {
  BIOMARKER_IDS,
  CANONICAL_UNITS,
  type BiomarkerId,
  type BiomarkerReading,
  type Profile,
  type ReferenceRange,
  type SupplementEntry,
} from "@/lib/domain/types";
import { isSupportedUnit } from "@/lib/domain/units";
import type { ExtractedReading } from "@/lib/pdf/parseReportText";
import type { AssessmentResult } from "@/lib/safety/policy";

export const BIOMARKER_LABELS: Record<BiomarkerId, string> = {
  vitaminD: "25-OH Vitamin D",
  b12: "Vitamin B12",
  folate: "Folate",
  ferritin: "Ferritin",
  magnesium: "Magnesium",
};

/** Display spellings of the units accepted by `isSupportedUnit`, canonical unit first. */
export const UNIT_OPTIONS: Record<BiomarkerId, string[]> = {
  vitaminD: ["ng/mL", "nmol/L"],
  b12: ["pg/mL", "pmol/L"],
  folate: ["ng/mL", "nmol/L"],
  ferritin: ["ng/mL", "µg/L"],
  magnesium: ["mmol/L", "mg/dL", "mEq/L"],
};

export interface DraftReading {
  id: BiomarkerId;
  /** false = "Not provided": excluded from the confirmed input. */
  provided: boolean;
  valueText: string;
  unit: string;
  /** Ranges read from the report (each carries its own unit). */
  ranges: ReferenceRange[];
  /** Typed lab range, used only when `ranges` is empty; interpreted in `unit`. */
  rangeLowText: string;
  rangeHighText: string;
  issues: string[];
  /** Conflicting values found in the report, for the user to choose from. */
  candidates: number[];
}

export type DraftSource = "pdf" | "manual" | "fixture";

export interface WalkthroughState {
  stage: StageId;
  draft: DraftReading[] | null;
  draftSource: DraftSource | null;
  parseNotice: string | null;
  unsupportedAnalytes: string[];
  biomarkers: BiomarkerReading[] | null;
  collectedOn: string | null;
  profile: Profile;
  supplements: SupplementEntry[];
  contextSubmitted: boolean;
  /** Incremented on every input change; results computed for an older version are ignored. */
  inputVersion: number;
  /** Incremented on every input change and every follow-up load; guards follow-up responses. */
  followUpVersion: number;
  result: AssessmentResult | null;
  resultState: "idle" | "loading" | "ready" | "error";
  resultError: string | null;
  followUp: { biomarkers: BiomarkerReading[]; result: AssessmentResult | null; error: string | null } | null;
}

export type WalkthroughAction =
  | { type: "reset" }
  | { type: "goTo"; stage: StageId }
  | {
      type: "loadDraft";
      draft: DraftReading[];
      source: DraftSource;
      collectedOn: string | null;
      notice: string | null;
      unsupportedAnalytes?: string[];
      profile?: Profile;
      supplements?: SupplementEntry[];
    }
  | { type: "editDraft"; id: BiomarkerId; patch: Partial<Omit<DraftReading, "id">> }
  | { type: "confirmDraft" }
  | { type: "setProfile"; profile: Partial<Profile> }
  | { type: "setSupplements"; supplements: SupplementEntry[] }
  | { type: "submitContext" }
  | { type: "editBiomarker"; id: BiomarkerId; value: number }
  | { type: "resultLoading" }
  | { type: "resultReceived"; result: AssessmentResult; inputVersion: number }
  | { type: "resultFailed"; message: string; inputVersion: number }
  | { type: "loadFollowUp"; biomarkers: BiomarkerReading[] }
  | { type: "followUpReceived"; result: AssessmentResult; followUpVersion: number }
  | { type: "followUpFailed"; message: string; followUpVersion: number };

export function emptyProfile(): Profile {
  return {
    age: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    diet: null,
    medications: { status: null, details: "" },
    medicalHistory: { status: null, details: "" },
    pregnancy: null,
    supplementsStatus: null,
  };
}

export function initialState(): WalkthroughState {
  return {
    stage: "start",
    draft: null,
    draftSource: null,
    parseNotice: null,
    unsupportedAnalytes: [],
    biomarkers: null,
    collectedOn: null,
    profile: emptyProfile(),
    supplements: [],
    contextSubmitted: false,
    inputVersion: 0,
    followUpVersion: 0,
    result: null,
    resultState: "idle",
    resultError: null,
    followUp: null,
  };
}

function blankRow(id: BiomarkerId, provided: boolean): DraftReading {
  return {
    id,
    provided,
    valueText: "",
    unit: CANONICAL_UNITS[id],
    ranges: [],
    rangeLowText: "",
    rangeHighText: "",
    issues: [],
    candidates: [],
  };
}

/** Manual entry: all five rows, blank, expected to be filled. */
export function emptyDraft(): DraftReading[] {
  return BIOMARKER_IDS.map((id) => blankRow(id, true));
}

export function draftFromReadings(readings: BiomarkerReading[]): DraftReading[] {
  return BIOMARKER_IDS.map((id) => {
    const r = readings.find((x) => x.id === id);
    if (!r) return blankRow(id, false);
    return { ...blankRow(id, true), valueText: String(r.value), unit: r.unit, ranges: r.ranges };
  });
}

/** Always five rows; biomarkers absent from the report start as "Not provided". */
export function draftFromExtraction(readings: ExtractedReading[]): DraftReading[] {
  return BIOMARKER_IDS.map((id) => {
    const r = readings.find((x) => x.id === id);
    if (!r) return blankRow(id, false);
    return {
      ...blankRow(id, true),
      valueText: r.value === null ? "" : String(r.value),
      unit: r.unit ?? "",
      ranges: r.ranges,
      issues: [...r.issues],
      candidates: [...r.candidates],
    };
  });
}

const NUMBER_TEXT = /^\d+(?:\.\d+)?$|^\.\d+$/;

function parseNumber(text: string): number | null {
  const t = text.trim();
  return NUMBER_TEXT.test(t) ? Number(t) : null;
}

function rowError(row: DraftReading): string | null {
  if (!row.provided) return null;
  if (row.issues.includes("conflicting_duplicate")) {
    return "The report lists different values for this test. Choose the correct one.";
  }
  const text = row.valueText.trim();
  if (text === "") return "Enter a value, or mark this test as not provided.";
  if (text.startsWith("-") && parseNumber(text.slice(1)) !== null) return "The value can't be negative.";
  if (parseNumber(text) === null) return "Enter a number, like 18 or 0.78.";
  if (!isSupportedUnit(row.id, row.unit)) {
    return row.unit ? `"${row.unit}" isn't a supported unit. Choose a unit from the list.` : "Choose a unit.";
  }
  if (row.ranges.length === 0) {
    for (const t of [row.rangeLowText, row.rangeHighText]) {
      if (t.trim() !== "" && parseNumber(t) === null) return "Lab range limits must be numbers, or left blank.";
    }
  }
  return null;
}

export function draftErrors(draft: DraftReading[]): Record<BiomarkerId, string | null> {
  const out = Object.fromEntries(BIOMARKER_IDS.map((id) => [id, null])) as Record<BiomarkerId, string | null>;
  for (const row of draft) out[row.id] = rowError(row);
  return out;
}

export const hasDraftErrors = (draft: DraftReading[]) => Object.values(draftErrors(draft)).some((e) => e !== null);

function rowRanges(row: DraftReading): ReferenceRange[] {
  if (row.ranges.length > 0) return row.ranges;
  const low = parseNumber(row.rangeLowText);
  const high = parseNumber(row.rangeHighText);
  return low === null && high === null ? [] : [{ low, high, unit: row.unit }];
}

const CONTEXT_FIELDS = ["age", "sex", "diet", "medications", "medicalHistory", "pregnancy", "supplementsStatus"] as const;
export type ContextField = (typeof CONTEXT_FIELDS)[number];

/** Seven required answers; height and weight are optional and not counted. */
export function contextProgress(profile: Profile): { answered: number; total: number; missing: ContextField[] } {
  const answered = (f: ContextField) =>
    f === "medications" || f === "medicalHistory" ? profile[f].status !== null : profile[f] !== null;
  const missing = CONTEXT_FIELDS.filter((f) => !answered(f));
  return { answered: CONTEXT_FIELDS.length - missing.length, total: CONTEXT_FIELDS.length, missing };
}

export function reachableStages(state: WalkthroughState): StageId[] {
  const out: StageId[] = ["start"];
  if (state.biomarkers) out.push("context");
  if (state.biomarkers && state.contextSubmitted) out.push("biomarkers", "formula");
  if (state.result) out.push("next");
  return out;
}

/** Applies an input change: bumps the version and drops any result computed from older inputs. */
function invalidate(state: WalkthroughState, patch: Partial<WalkthroughState>): WalkthroughState {
  return {
    ...state,
    ...patch,
    inputVersion: state.inputVersion + 1,
    followUpVersion: state.followUpVersion + 1,
    result: null,
    resultState: "idle",
    resultError: null,
    followUp: state.followUp ? { ...state.followUp, result: null, error: null } : null,
  };
}

export function walkthroughReducer(state: WalkthroughState, action: WalkthroughAction): WalkthroughState {
  switch (action.type) {
    case "reset":
      return initialState();

    case "goTo":
      return reachableStages(state).includes(action.stage) ? { ...state, stage: action.stage } : state;

    case "loadDraft":
      return invalidate(state, {
        stage: "start",
        draft: action.draft,
        draftSource: action.source,
        collectedOn: action.collectedOn,
        parseNotice: action.notice,
        unsupportedAnalytes: action.unsupportedAnalytes ?? [],
        biomarkers: null,
        ...(action.profile ? { profile: action.profile } : {}),
        ...(action.supplements ? { supplements: action.supplements } : {}),
      });

    case "editDraft": {
      if (!state.draft) return state;
      const draft = state.draft.map((row) => {
        if (row.id !== action.id) return row;
        const next = { ...row, ...action.patch };
        // A value typed or chosen by the user resolves a conflicting duplicate.
        if (action.patch.valueText !== undefined) next.issues = next.issues.filter((i) => i !== "conflicting_duplicate");
        if (action.patch.unit !== undefined) {
          next.issues = next.issues.filter((i) => i !== "missing_unit" && i !== "unsupported_unit");
          // Ranges printed without a usable unit share the reading's unit.
          next.ranges = next.ranges.map((r) => (isSupportedUnit(row.id, r.unit) ? r : { ...r, unit: next.unit }));
        }
        return next;
      });
      // Once confirmed, any edit to the review is an input change: re-confirmation is required.
      return state.biomarkers ? invalidate(state, { draft, biomarkers: null }) : { ...state, draft };
    }

    case "confirmDraft": {
      if (!state.draft || hasDraftErrors(state.draft)) return state;
      const source = state.draftSource ?? "manual";
      const biomarkers: BiomarkerReading[] = state.draft
        .filter((row) => row.provided)
        .map((row) => ({
          id: row.id,
          value: Number(row.valueText.trim()),
          unit: row.unit,
          ranges: rowRanges(row),
          source,
          collectedOn: state.collectedOn,
        }));
      return invalidate(state, { biomarkers, stage: "context" });
    }

    case "setProfile":
      return invalidate(state, { profile: { ...state.profile, ...action.profile } });

    case "setSupplements":
      return invalidate(state, { supplements: action.supplements });

    case "submitContext":
      return state.biomarkers ? { ...state, contextSubmitted: true, stage: "biomarkers" } : state;

    case "editBiomarker":
      if (!state.biomarkers) return state;
      return invalidate(state, {
        biomarkers: state.biomarkers.map((b) => (b.id === action.id ? { ...b, value: action.value } : b)),
      });

    case "resultLoading":
      return { ...state, result: null, resultState: "loading", resultError: null };

    case "resultReceived":
      if (action.inputVersion !== state.inputVersion) return state;
      return { ...state, result: action.result, resultState: "ready", resultError: null };

    case "resultFailed":
      if (action.inputVersion !== state.inputVersion) return state;
      return { ...state, result: null, resultState: "error", resultError: action.message };

    case "loadFollowUp":
      // Separate input from the primary assessment: the v1 result stays valid.
      return {
        ...state,
        followUpVersion: state.followUpVersion + 1,
        followUp: { biomarkers: action.biomarkers, result: null, error: null },
      };

    case "followUpReceived":
      if (action.followUpVersion !== state.followUpVersion || !state.followUp) return state;
      return { ...state, followUp: { ...state.followUp, result: action.result, error: null } };

    case "followUpFailed":
      if (action.followUpVersion !== state.followUpVersion || !state.followUp) return state;
      return { ...state, followUp: { ...state.followUp, result: null, error: action.message } };
  }
}
