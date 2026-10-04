"use client";

import { useId, useState } from "react";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import { canChangeSupplements, supplementsStatusAfterChange } from "@/lib/client/tryChange";
import { SUPPLEMENT_CATALOG } from "@/lib/domain/supplements";
import type { Profile, SupplementEntry } from "@/lib/domain/types";

const D3_AMOUNTS = [0, 400, 1000, 2500];
const DIETS: { value: NonNullable<Profile["diet"]>; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "other", label: "Other" },
  { value: "unknown", label: "Unknown" },
];
const field = "rounded-lg border border-ink/20 bg-white px-2.5 py-1.5 text-ink";
const label = "text-xs font-semibold text-ink";

export function TryAChange() {
  const { state, dispatch, requestAssessment } = useWalkthrough();
  const { profile, supplements } = state;
  const vitD = state.biomarkers?.find((b) => b.id === "vitaminD");
  const value = vitD?.value ?? null;

  // Keep what the person is typing (even a blank field) until the stored value changes underneath it.
  const [text, setText] = useState(value === null ? "" : String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== null && Number(text) !== value) setText(String(value));
  }
  const ids = { d: useId(), diet: useId(), sup: useId(), supNote: useId() };

  // The edit invalidates the old result at once (no stale amounts); the stage then sends one debounced request.
  function changeVitaminD(next: string) {
    setText(next);
    const n = Number(next);
    if (next.trim() === "" || !Number.isFinite(n) || n < 0) return;
    dispatch({ type: "editBiomarker", id: "vitaminD", value: n });
  }

  const d3 = supplements.find((s) => s.productId === "vitamin-d3");
  const d3Daily = d3 && d3.amountPerDose !== null && d3.unit === "IU" && d3.timesPerWeek === 7 ? d3.amountPerDose : null;
  const d3Value = !d3 ? 0 : d3Daily !== null && D3_AMOUNTS.includes(d3Daily) ? d3Daily : -1;

  const d3Locked = !canChangeSupplements(profile.supplementsStatus);

  function changeD3(amount: number) {
    if (d3Locked) return;
    const others = supplements.filter((s) => s.productId !== "vitamin-d3");
    const entry: SupplementEntry = {
      productId: "vitamin-d3",
      label: SUPPLEMENT_CATALOG["vitamin-d3"].label,
      amountPerDose: amount,
      unit: "IU",
      timesPerWeek: 7,
    };
    const first = supplements.findIndex((s) => s.productId === "vitamin-d3");
    const next =
      amount === 0
        ? others
        : first === -1
          ? [...supplements, entry]
          : supplements.flatMap((s, i) => (i === first ? [entry] : s.productId === "vitamin-d3" ? [] : [s]));
    const status = supplementsStatusAfterChange(profile.supplementsStatus, next.length);
    if (status === null) return;
    dispatch({ type: "setSupplements", supplements: next });
    dispatch({ type: "setProfile", profile: { supplementsStatus: status } });
    requestAssessment();
  }

  function changeHistory(status: "none" | "some") {
    dispatch({
      type: "setProfile",
      profile: { medicalHistory: status === "some" ? { status, details: "Added in Try a change" } : { status, details: "" } },
    });
    requestAssessment();
  }

  return (
    <section aria-labelledby="try-heading" className="rounded-2xl border border-teal/25 bg-teal-soft/50 px-5 py-4">
      <p className="text-sm text-ink-muted">
        <span id="try-heading" className="font-display text-lg font-semibold text-teal">
          Try a change
        </span>{" "}
        and watch every card re-evaluate.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <label htmlFor={ids.d} className={label}>
            Vitamin D value
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id={ids.d}
              type="number"
              min={0}
              step="any"
              value={text}
              onChange={(e) => changeVitaminD(e.target.value)}
              className={field + " w-20"}
            />
            <span className="text-sm text-ink-muted">{vitD?.unit ?? "ng/mL"}</span>
            {vitD?.unit === "ng/mL" && (
              <input
                type="range"
                aria-label="Vitamin D slider"
                min={5}
                max={80}
                step={1}
                value={Math.min(80, Math.max(5, value ?? 5))}
                onChange={(e) => changeVitaminD(e.target.value)}
                className="ml-1 w-36 accent-teal"
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor={ids.diet} className={label}>
            Diet
          </label>
          <div className="mt-1">
            <select
              id={ids.diet}
              value={profile.diet ?? ""}
              onChange={(e) => {
                dispatch({ type: "setProfile", profile: { diet: e.target.value as Profile["diet"] } });
                requestAssessment();
              }}
              className={field}
            >
              {profile.diet === null && <option value="">Not answered</option>}
              {DIETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={ids.sup} className={label}>
            Existing Vitamin D3 supplement
          </label>
          <div className="mt-1">
            <select id={ids.sup} value={d3Value} disabled={d3Locked} aria-describedby={d3Locked ? ids.supNote : undefined} onChange={(e) => changeD3(Number(e.target.value))} className={field + " disabled:opacity-60"}>
              {d3Value === -1 && <option value={-1}>Your entered amount</option>}
              {D3_AMOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a === 0 ? "None" : `${a.toLocaleString("en-US")} IU daily`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className={label}>Medical history</legend>
          <div className="mt-1 flex gap-1.5">
            {(
              [
                ["none", "None"],
                ["some", "Yes"],
              ] as const
            ).map(([status, text]) => (
              <label
                key={status}
                className="cursor-pointer rounded-full border border-teal/30 bg-white px-3.5 py-1.5 text-sm font-medium text-teal has-checked:border-teal has-checked:bg-teal has-checked:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-amber"
              >
                <input
                  type="radio"
                  name="try-history"
                  checked={profile.medicalHistory.status === status}
                  onChange={() => changeHistory(status)}
                  className="sr-only"
                />
                {text}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      {d3Locked && (
        <p id={ids.supNote} className="mt-2 text-sm text-ink-muted">
          Answer the supplements question in Your Context to try this.
        </p>
      )}
    </section>
  );
}
