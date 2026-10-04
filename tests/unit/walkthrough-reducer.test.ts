import { describe, expect, it } from "vitest";
import {
  contextProgress,
  draftErrors,
  draftFromExtraction,
  draftFromReadings,
  emptyDraft,
  emptyProfile,
  initialState,
  reachableStages,
  walkthroughReducer as reduce,
  type DraftReading,
  type WalkthroughAction,
  type WalkthroughState,
} from "@/lib/client/walkthrough";
import { PRIMARY_PROFILE, PRIMARY_SUPPLEMENTS, PRIMARY_V1_BIOMARKERS } from "@/fixtures/scenarios";
import type { AssessmentResult } from "@/lib/safety/policy";

const FAKE_RESULT = { status: "ready" } as unknown as AssessmentResult;

function confirmed(): WalkthroughState {
  let s = reduce(initialState(), {
    type: "loadDraft",
    draft: draftFromReadings(PRIMARY_V1_BIOMARKERS),
    source: "fixture",
    collectedOn: "2026-07-01",
    notice: null,
  });
  s = reduce(s, { type: "confirmDraft" });
  s = reduce(s, { type: "setProfile", profile: PRIMARY_PROFILE });
  s = reduce(s, { type: "setSupplements", supplements: PRIMARY_SUPPLEMENTS });
  return reduce(s, { type: "submitContext" });
}

function withResult(): WalkthroughState {
  const s = reduce(confirmed(), { type: "resultLoading" });
  return reduce(s, { type: "resultReceived", result: FAKE_RESULT, inputVersion: s.inputVersion });
}

const row = (draft: DraftReading[], id: string) => draft.find((r) => r.id === id)!;

describe("emptyProfile / initialState", () => {
  it("has every profile answer null and details blank", () => {
    expect(emptyProfile()).toEqual({
      age: null,
      sex: null,
      heightCm: null,
      weightKg: null,
      diet: null,
      medications: { status: null, details: "" },
      medicalHistory: { status: null, details: "" },
      pregnancy: null,
      supplementsStatus: null,
    });
  });

  it("starts at the start stage with nothing loaded", () => {
    const s = initialState();
    expect(s).toMatchObject({ stage: "start", draft: null, biomarkers: null, result: null, resultState: "idle", followUp: null });
    expect(reachableStages(s)).toEqual(["start"]);
  });
});

describe("draftErrors", () => {
  const base = draftFromReadings(PRIMARY_V1_BIOMARKERS);
  const edit = (patch: Partial<DraftReading>) => base.map((r) => (r.id === "vitaminD" ? { ...r, ...patch } : r));

  it("has no errors for the primary fixture", () => {
    expect(Object.values(draftErrors(base)).every((e) => e === null)).toBe(true);
  });

  it.each(["", "abc", "-1", "1e", "  "])("flags value %j", (valueText) => {
    expect(draftErrors(edit({ valueText })).vitaminD).toEqual(expect.any(String));
  });

  it("flags an unsupported unit", () => {
    expect(draftErrors(edit({ unit: "g/L" })).vitaminD).toEqual(expect.any(String));
  });

  it("flags an unresolved conflicting duplicate", () => {
    expect(draftErrors(edit({ valueText: "", issues: ["conflicting_duplicate"], candidates: [18, 21] })).vitaminD).toEqual(
      expect.any(String),
    );
  });

  it("does not flag rows marked not provided", () => {
    expect(draftErrors(edit({ provided: false, valueText: "" })).vitaminD).toBeNull();
  });

  it("flags non-numeric manual range bounds", () => {
    expect(draftErrors(edit({ ranges: [], rangeLowText: "x" })).vitaminD).toEqual(expect.any(String));
  });
});

describe("draftFromExtraction", () => {
  it("always returns all five rows; missing rows start as not provided", () => {
    const draft = draftFromExtraction([
      { id: "b12", label: "Vitamin B12", value: 480, unit: "pg/mL", ranges: [], issues: [], candidates: [] },
    ]);
    expect(draft.map((r) => r.id)).toEqual(["vitaminD", "b12", "folate", "ferritin", "magnesium"]);
    expect(row(draft, "b12")).toMatchObject({ provided: true, valueText: "480", unit: "pg/mL" });
    expect(row(draft, "vitaminD")).toMatchObject({ provided: false, valueText: "" });
  });

  it("keeps conflicting candidates for the user to choose", () => {
    const draft = draftFromExtraction([
      { id: "vitaminD", label: "x", value: null, unit: "ng/mL", ranges: [], issues: ["conflicting_duplicate"], candidates: [18, 21] },
    ]);
    expect(row(draft, "vitaminD")).toMatchObject({ provided: true, valueText: "", candidates: [18, 21] });
    expect(draftErrors(draft).vitaminD).not.toBeNull();
  });
});

describe("walkthroughReducer", () => {
  it("confirmDraft with an error leaves state unchanged", () => {
    let s = reduce(initialState(), { type: "loadDraft", draft: emptyDraft(), source: "manual", collectedOn: null, notice: null });
    s = reduce(s, { type: "editDraft", id: "vitaminD", patch: { valueText: "abc" } });
    expect(reduce(s, { type: "confirmDraft" })).toBe(s);
  });

  it("confirmDraft converts provided rows into readings and moves to context", () => {
    let s = reduce(initialState(), {
      type: "loadDraft",
      draft: draftFromReadings(PRIMARY_V1_BIOMARKERS),
      source: "pdf",
      collectedOn: "2026-07-01",
      notice: null,
    });
    s = reduce(s, { type: "editDraft", id: "ferritin", patch: { provided: false } });
    s = reduce(s, { type: "confirmDraft" });
    expect(s.stage).toBe("context");
    expect(s.biomarkers).toHaveLength(4);
    expect(s.biomarkers![0]).toEqual({
      id: "vitaminD",
      value: 18,
      unit: "ng/mL",
      ranges: [{ low: 20, high: 50, unit: "ng/mL" }],
      source: "pdf",
      collectedOn: "2026-07-01",
    });
    expect(reachableStages(s)).toEqual(["start", "context"]);
  });

  it("uses a typed manual range in the reading unit", () => {
    let s = reduce(initialState(), { type: "loadDraft", draft: emptyDraft(), source: "manual", collectedOn: null, notice: null });
    for (const id of ["b12", "folate", "ferritin", "magnesium"] as const) {
      s = reduce(s, { type: "editDraft", id, patch: { provided: false } });
    }
    s = reduce(s, { type: "editDraft", id: "vitaminD", patch: { valueText: "45", unit: "nmol/L", rangeLowText: "50", rangeHighText: "125" } });
    s = reduce(s, { type: "confirmDraft" });
    expect(s.biomarkers).toEqual([
      { id: "vitaminD", value: 45, unit: "nmol/L", ranges: [{ low: 50, high: 125, unit: "nmol/L" }], source: "manual", collectedOn: null },
    ]);
  });

  it("editing the value resolves a conflicting duplicate", () => {
    const draft = draftFromExtraction([
      { id: "vitaminD", label: "x", value: null, unit: "ng/mL", ranges: [], issues: ["conflicting_duplicate"], candidates: [18, 21] },
    ]);
    let s = reduce(initialState(), { type: "loadDraft", draft, source: "pdf", collectedOn: null, notice: null });
    s = reduce(s, { type: "editDraft", id: "vitaminD", patch: { valueText: "21" } });
    expect(row(s.draft!, "vitaminD").issues).not.toContain("conflicting_duplicate");
    expect(draftErrors(s.draft!).vitaminD).toBeNull();
  });

  it("editBiomarker after resultReceived clears the result", () => {
    const s = withResult();
    expect(s.result).toBe(FAKE_RESULT);
    const next = reduce(s, { type: "editBiomarker", id: "vitaminD", value: 30 });
    expect(next.result).toBeNull();
    expect(next.resultState).toBe("idle");
    expect(next.biomarkers!.find((b) => b.id === "vitaminD")!.value).toBe(30);
  });

  it.each<WalkthroughAction>([
    { type: "setProfile", profile: { diet: "omnivore" } },
    { type: "setSupplements", supplements: [] },
    { type: "confirmDraft" },
    { type: "editDraft", id: "vitaminD", patch: { valueText: "25" } },
  ])("$type invalidates the result and follow-up result", (action) => {
    let s = reduce(withResult(), { type: "loadFollowUp", biomarkers: PRIMARY_V1_BIOMARKERS });
    s = reduce(s, { type: "followUpReceived", result: FAKE_RESULT, followUpVersion: s.followUpVersion });
    expect(s.followUp!.result).toBe(FAKE_RESULT);
    const next = reduce(s, action);
    expect(next.result).toBeNull();
    expect(next.resultState).toBe("idle");
    expect(next.followUp!.result).toBeNull();
  });

  it("editing the review after confirming drops the confirmed biomarkers and later stages", () => {
    const s = reduce(withResult(), { type: "editDraft", id: "vitaminD", patch: { valueText: "25" } });
    expect(s.biomarkers).toBeNull();
    expect(s.result).toBeNull();
    expect(reachableStages(s)).toEqual(["start"]);
    expect(reduce(s, { type: "confirmDraft" }).biomarkers!.find((b) => b.id === "vitaminD")!.value).toBe(25);
  });

  it("editing an unconfirmed draft does not bump the input version", () => {
    const s = reduce(initialState(), { type: "loadDraft", draft: emptyDraft(), source: "manual", collectedOn: null, notice: null });
    expect(reduce(s, { type: "editDraft", id: "b12", patch: { valueText: "1" } }).inputVersion).toBe(s.inputVersion);
  });

  it("ignores a follow-up result requested for previously loaded follow-up biomarkers", () => {
    const first = reduce(withResult(), { type: "loadFollowUp", biomarkers: PRIMARY_V1_BIOMARKERS });
    const second = reduce(first, { type: "loadFollowUp", biomarkers: PRIMARY_V1_BIOMARKERS.slice(0, 2) });
    expect(second.result).toBe(FAKE_RESULT);
    expect(reduce(second, { type: "followUpReceived", result: FAKE_RESULT, followUpVersion: first.followUpVersion })).toBe(second);
    expect(reduce(second, { type: "followUpReceived", result: FAKE_RESULT, followUpVersion: second.followUpVersion }).followUp!.result).toBe(
      FAKE_RESULT,
    );
  });

  it("ignores a result computed for older inputs", () => {
    const s = reduce(confirmed(), { type: "resultLoading" });
    const version = s.inputVersion;
    const edited = reduce(s, { type: "editBiomarker", id: "vitaminD", value: 25 });
    expect(reduce(edited, { type: "resultReceived", result: FAKE_RESULT, inputVersion: version })).toBe(edited);
  });

  it("resultFailed records the error", () => {
    const s = reduce(reduce(confirmed(), { type: "resultLoading" }), { type: "resultFailed", message: "nope", inputVersion: 99 });
    expect(s.resultState).toBe("loading");
    const v = reduce(confirmed(), { type: "resultLoading" });
    const failed = reduce(v, { type: "resultFailed", message: "nope", inputVersion: v.inputVersion });
    expect(failed).toMatchObject({ resultState: "error", resultError: "nope", result: null });
  });

  it("reachable stages follow progress", () => {
    const s = confirmed();
    expect(reachableStages(s)).toEqual(["start", "context", "biomarkers", "formula"]);
    expect(reachableStages(withResult())).toEqual(["start", "context", "biomarkers", "formula", "next"]);
  });

  it("goTo ignores unreachable stages", () => {
    const s = initialState();
    expect(reduce(s, { type: "goTo", stage: "formula" })).toBe(s);
    expect(reduce(confirmed(), { type: "goTo", stage: "start" }).stage).toBe("start");
  });

  it("reset returns the initial state", () => {
    expect(reduce(withResult(), { type: "reset" })).toEqual(initialState());
  });
});

describe("contextProgress", () => {
  it("counts the seven required answers and ignores height/weight", () => {
    expect(contextProgress(emptyProfile())).toEqual({ answered: 0, total: 7, missing: expect.any(Array) });
    expect(contextProgress({ ...emptyProfile(), heightCm: 170, weightKg: 70 }).answered).toBe(0);
    expect(contextProgress(PRIMARY_PROFILE)).toEqual({ answered: 7, total: 7, missing: [] });
    expect(contextProgress({ ...PRIMARY_PROFILE, pregnancy: null }).missing).toEqual(["pregnancy"]);
  });
});
