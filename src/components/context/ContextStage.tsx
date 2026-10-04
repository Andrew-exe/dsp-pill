"use client";

import { useId, type ReactNode } from "react";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import { PRIMARY_PROFILE, PRIMARY_SUPPLEMENTS } from "@/fixtures/scenarios";
import { contextProgress, type ContextField } from "@/lib/client/walkthrough";
import { SUPPLEMENT_CATALOG } from "@/lib/domain/supplements";
import {
  SUPPLEMENT_PRODUCT_IDS,
  type Profile,
  type SupplementEntry,
} from "@/lib/domain/types";

const FIELD_NAMES: Record<ContextField, string> = {
  age: "Age",
  sex: "Sex used for lab context",
  diet: "Diet",
  medications: "Medications",
  medicalHistory: "Relevant medical history",
  pregnancy: "Pregnancy or breastfeeding",
  supplementsStatus: "Existing supplements",
};

type Status = "none" | "some" | "unknown";
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "none", label: "None" },
  { value: "some", label: "Yes" },
  { value: "unknown", label: "Unknown" },
];

const ALL_UNITS: SupplementEntry["unit"][] = ["IU", "mcg", "mg", "serving"];
const OTHER_LABEL = "Other / not sure";

const fieldBox = "rounded-lg border border-ink/20 bg-white px-3 py-2 text-lg text-ink";

function toNumber(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function ContextStage() {
  const { state, dispatch, requestAssessment } = useWalkthrough();
  const { profile, supplements } = state;
  const progress = contextProgress(profile);
  const missing = new Set(progress.missing);
  const set = (patch: Partial<Profile>) => dispatch({ type: "setProfile", profile: patch });
  const setEntries = (entries: SupplementEntry[]) => dispatch({ type: "setSupplements", supplements: entries });

  function setSupplementsStatus(status: Status) {
    set({ supplementsStatus: status });
    if (status === "some" && supplements.length === 0) setEntries([newEntry()]);
    // Entries only make sense when supplements are reported; hidden entries must not change the analysis.
    if (status !== "some" && supplements.length > 0) setEntries([]);
  }

  function seeAnalysis() {
    dispatch({ type: "submitContext" });
    requestAssessment();
  }

  return (
    <section aria-labelledby="stage-heading">
      <h2 id="stage-heading" tabIndex={-1} className="font-display text-4xl font-semibold text-teal outline-none">
        Your Context
      </h2>
      <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-muted">
        A few answers decide whether this prototype may propose amounts at all. Leave anything you&apos;re unsure of
        blank or choose Unknown: unanswered questions send the analysis to clinician review, never to a default.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
        <form className="space-y-8" onSubmit={(e) => e.preventDefault()} aria-label="Your context">
          <div className="grid gap-8 sm:grid-cols-[10rem_1fr]">
            <Question title="Age" unanswered={missing.has("age")}>
              {(id) => (
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    type="number"
                    min={0}
                    max={120}
                    inputMode="numeric"
                    value={profile.age ?? ""}
                    onChange={(e) => set({ age: toNumber(e.target.value) })}
                    className={fieldBox + " w-24"}
                  />
                  <span className="text-ink-muted">years</span>
                </div>
              )}
            </Question>
            <Choice
              title="Sex used for lab context"
              hint="Only used to pick a sex-specific lab range when your report gives one. It never changes an amount."
              unanswered={missing.has("sex")}
              value={profile.sex}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "unknown", label: "Unknown" },
              ]}
              onChange={(sex) => set({ sex })}
            />
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <Question title="Height" optional>
              {(id) => (
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    type="number"
                    min={0}
                    value={profile.heightCm ?? ""}
                    onChange={(e) => set({ heightCm: toNumber(e.target.value) })}
                    className={fieldBox + " w-28"}
                  />
                  <span className="text-ink-muted">cm</span>
                </div>
              )}
            </Question>
            <Question title="Weight" optional>
              {(id) => (
                <div className="flex items-center gap-2">
                  <input
                    id={id}
                    type="number"
                    min={0}
                    value={profile.weightKg ?? ""}
                    onChange={(e) => set({ weightKg: toNumber(e.target.value) })}
                    className={fieldBox + " w-28"}
                  />
                  <span className="text-ink-muted">kg</span>
                </div>
              )}
            </Question>
          </div>

          <Choice
            title="Diet"
            unanswered={missing.has("diet")}
            value={profile.diet}
            options={[
              { value: "omnivore", label: "Omnivore" },
              { value: "vegetarian", label: "Vegetarian" },
              { value: "vegan", label: "Vegan" },
              { value: "other", label: "Other" },
            ]}
            onChange={(diet) => set({ diet })}
          />

          <StatusWithDetails
            title="Medications"
            detailsLabel="Which medications?"
            unanswered={missing.has("medications")}
            value={profile.medications}
            onChange={(medications) => set({ medications })}
          />
          <StatusWithDetails
            title="Relevant medical history"
            detailsLabel="What history?"
            unanswered={missing.has("medicalHistory")}
            value={profile.medicalHistory}
            onChange={(medicalHistory) => set({ medicalHistory })}
          />

          <Choice
            title="Pregnancy or breastfeeding"
            hint="Asked on its own because it changes what this prototype may propose."
            unanswered={missing.has("pregnancy")}
            value={profile.pregnancy}
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
              { value: "unknown", label: "Unknown" },
              { value: "not_applicable", label: "Not applicable" },
            ]}
            onChange={(pregnancy) => set({ pregnancy })}
          />

          <div>
            <Choice
              title="Existing supplements"
              hint="Anything you already take is subtracted from the formula, never asked to be stopped."
              unanswered={missing.has("supplementsStatus")}
              value={profile.supplementsStatus}
              options={STATUS_OPTIONS}
              onChange={setSupplementsStatus}
            />
            {profile.supplementsStatus === "some" && (
              <SupplementList entries={supplements} onChange={setEntries} />
            )}
          </div>
        </form>

        <aside className="lg:sticky lg:top-16 lg:self-start">
          <div className="rounded-2xl border border-teal/20 bg-ivory-deep p-6">
            <p className="font-display text-3xl text-teal" aria-live="polite">
              {progress.answered} of {progress.total} answered
            </p>
            <div aria-hidden className="mt-3 flex gap-1">
              {Array.from({ length: progress.total }, (_, i) => (
                <span key={i} className={"h-1.5 flex-1 rounded-full " + (i < progress.answered ? "bg-teal" : "bg-ink/10")} />
              ))}
            </div>
            {progress.missing.length > 0 && (
              <div className="mt-4 text-sm text-ink-muted">
                <p>Still unanswered:</p>
                <ul className="mt-1 list-disc pl-5">
                  {progress.missing.map((f) => (
                    <li key={f}>{FIELD_NAMES[f]}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={seeAnalysis}
              className="mt-6 w-full rounded-full bg-teal px-6 py-3.5 text-lg font-semibold text-ivory hover:bg-teal/90"
            >
              See my analysis
            </button>
            {progress.missing.length > 0 && (
              <p className="mt-3 text-sm text-ink-muted">
                You can continue now; unanswered safety questions mean no amounts are proposed.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                set(PRIMARY_PROFILE);
                setEntries(PRIMARY_SUPPLEMENTS);
              }}
              className="mt-5 w-full rounded-full border border-teal/40 px-5 py-2.5 font-semibold text-teal hover:border-teal"
            >
              Fill synthetic profile
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function UnansweredTag() {
  return <span className="ml-2 text-sm font-semibold text-amber-ink">Not answered yet</span>;
}

/** A single labelled control. */
function Question({
  title,
  optional,
  unanswered,
  children,
}: {
  title: string;
  optional?: boolean;
  unanswered?: boolean;
  children(id: string): ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <p className="font-semibold text-ink">
        <label htmlFor={id}>{title}</label>
        {optional && <span className="ml-2 text-sm font-normal text-ink-muted">optional</span>}
        {unanswered && <UnansweredTag />}
      </p>
      <div className="mt-2">{children(id)}</div>
    </div>
  );
}

function Choice<T extends string>({
  title,
  hint,
  unanswered,
  value,
  options,
  onChange,
}: {
  title: string;
  hint?: string;
  unanswered?: boolean;
  value: T | null;
  options: { value: T; label: string }[];
  onChange(value: T): void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="font-semibold text-ink">
        {title}
        {unanswered && <UnansweredTag />}
      </legend>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-full border border-teal/30 bg-white px-4 py-2 font-medium text-teal transition-colors hover:border-teal has-checked:border-teal has-checked:bg-teal has-checked:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-amber"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StatusWithDetails({
  title,
  detailsLabel,
  unanswered,
  value,
  onChange,
}: {
  title: string;
  detailsLabel: string;
  unanswered: boolean;
  value: Profile["medications"];
  onChange(value: Profile["medications"]): void;
}) {
  const id = useId();
  return (
    <div>
      <Choice
        title={title}
        unanswered={unanswered}
        value={value.status}
        options={STATUS_OPTIONS}
        onChange={(status) => onChange({ ...value, status })}
      />
      {value.status === "some" && (
        <div className="mt-3 max-w-xl">
          <label htmlFor={id} className="text-sm font-semibold text-ink">
            {detailsLabel}
          </label>
          <input
            id={id}
            type="text"
            value={value.details}
            onChange={(e) => onChange({ ...value, details: e.target.value })}
            className={fieldBox + " mt-1 w-full"}
          />
        </div>
      )}
    </div>
  );
}

function newEntry(): SupplementEntry {
  return { productId: "vitamin-d3", label: SUPPLEMENT_CATALOG["vitamin-d3"].label, amountPerDose: null, unit: "IU", timesPerWeek: 7 };
}

function SupplementList({ entries, onChange }: { entries: SupplementEntry[]; onChange(entries: SupplementEntry[]): void }) {
  const update = (i: number, patch: Partial<SupplementEntry>) =>
    onChange(entries.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  function changeProduct(i: number, productId: SupplementEntry["productId"]) {
    if (productId === "other") return update(i, { productId, label: OTHER_LABEL });
    const item = SUPPLEMENT_CATALOG[productId];
    const unit = item.allowedUnits.includes(entries[i].unit) ? entries[i].unit : item.allowedUnits[0];
    update(i, { productId, label: item.label, unit });
  }

  return (
    <div className="mt-4 space-y-3">
      {entries.map((entry, i) => {
        const n = i + 1;
        const units = entry.productId === "other" ? ALL_UNITS : SUPPLEMENT_CATALOG[entry.productId].allowedUnits;
        return (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-ink/10 bg-white/70 p-4">
            <label className="flex flex-col text-sm font-semibold text-ink">
              Product
              <select
                aria-label={`Supplement ${n} product`}
                value={entry.productId}
                onChange={(e) => changeProduct(i, e.target.value as SupplementEntry["productId"])}
                className={fieldBox + " mt-1 font-normal"}
              >
                {SUPPLEMENT_PRODUCT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SUPPLEMENT_CATALOG[id].label}
                  </option>
                ))}
                <option value="other">{OTHER_LABEL}</option>
              </select>
            </label>
            <label className="flex flex-col text-sm font-semibold text-ink">
              Amount per dose
              <input
                aria-label={`Supplement ${n} amount per dose`}
                type="number"
                min={0}
                value={entry.amountPerDose ?? ""}
                onChange={(e) => update(i, { amountPerDose: toNumber(e.target.value) })}
                className={fieldBox + " mt-1 w-28 font-normal"}
              />
            </label>
            <label className="flex flex-col text-sm font-semibold text-ink">
              Unit
              <select
                aria-label={`Supplement ${n} unit`}
                value={entry.unit}
                onChange={(e) => update(i, { unit: e.target.value as SupplementEntry["unit"] })}
                className={fieldBox + " mt-1 font-normal"}
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-semibold text-ink">
              Times per week
              <input
                aria-label={`Supplement ${n} times per week`}
                type="number"
                min={0}
                max={28}
                value={entry.timesPerWeek ?? ""}
                onChange={(e) => update(i, { timesPerWeek: toNumber(e.target.value) })}
                className={fieldBox + " mt-1 w-24 font-normal"}
              />
            </label>
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, j) => j !== i))}
              aria-label={`Remove supplement ${n}`}
              className="mb-2 text-sm font-semibold text-ink-muted underline underline-offset-4 hover:text-teal"
            >
              Remove
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...entries, newEntry()])}
        className="rounded-full border border-teal/40 px-4 py-2 font-semibold text-teal hover:border-teal"
      >
        Add a supplement
      </button>
    </div>
  );
}
