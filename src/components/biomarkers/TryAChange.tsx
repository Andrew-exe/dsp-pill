"use client";

import { useId, useState } from "react";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
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
const field = "rounded-lg border border-ink/20 bg-white px-3 py-2 text-lg text-ink";

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
  const ids = { d: useId(), diet: useId(), sup: useId() };

  function changeVitaminD(next: string) {
    setText(next);
    const n = Number(next);
    if (next.trim() === "" || !Number.isFinite(n) || n < 0) return;
    dispatch({ type: "editBiomarker", id: "vitaminD", value: n });
    requestAssessment();
  }

  const d3 = supplements.find((s) => s.productId === "vitamin-d3");
  const d3Daily = d3 && d3.amountPerDose !== null && d3.unit === "IU" && d3.timesPerWeek === 7 ? d3.amountPerDose : null;
  const d3Value = !d3 ? 0 : d3Daily !== null && D3_AMOUNTS.includes(d3Daily) ? d3Daily : -1;

  function changeD3(amount: number) {
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
    dispatch({ type: "setSupplements", supplements: next });
    dispatch({ type: "setProfile", profile: { supplementsStatus: next.length > 0 ? "some" : "none" } });
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
    <section aria-labelledby="try-heading" className="rounded-2xl border border-teal/25 bg-teal-soft/50 p-6 sm:p-8">
      <h3 id="try-heading" className="font-display text-2xl font-semibold text-teal">
        Try a change
      </h3>
      <p className="mt-1 max-w-2xl text-ink-muted">
        Change an input and watch every card and amount re-evaluate. Nothing leaves this browser tab except the
        structured values.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor={ids.d} className="font-semibold text-ink">
            Vitamin D value
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id={ids.d}
              type="number"
              min={0}
              step="any"
              value={text}
              onChange={(e) => changeVitaminD(e.target.value)}
              className={field + " w-28"}
            />
            <span className="text-ink-muted">{vitD?.unit ?? "ng/mL"}</span>
          </div>
          {vitD?.unit === "ng/mL" && (
            <input
              type="range"
              aria-label="Vitamin D slider"
              min={5}
              max={80}
              step={1}
              value={Math.min(80, Math.max(5, value ?? 5))}
              onChange={(e) => changeVitaminD(e.target.value)}
              className="mt-3 w-full accent-teal"
            />
          )}
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor={ids.diet} className="font-semibold text-ink">
              Diet
            </label>
            <div className="mt-2">
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
            <label htmlFor={ids.sup} className="font-semibold text-ink">
              Existing Vitamin D3 supplement
            </label>
            <div className="mt-2">
              <select id={ids.sup} value={d3Value} onChange={(e) => changeD3(Number(e.target.value))} className={field}>
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
            <legend className="font-semibold text-ink">Medical history</legend>
            <div className="mt-2 flex gap-2">
              {(
                [
                  ["none", "None"],
                  ["some", "Yes"],
                ] as const
              ).map(([status, label]) => (
                <label
                  key={status}
                  className="cursor-pointer rounded-full border border-teal/30 bg-white px-4 py-2 font-medium text-teal has-checked:border-teal has-checked:bg-teal has-checked:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-amber"
                >
                  <input
                    type="radio"
                    name="try-history"
                    checked={profile.medicalHistory.status === status}
                    onChange={() => changeHistory(status)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  );
}
