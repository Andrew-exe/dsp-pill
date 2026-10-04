"use client";

import { useState } from "react";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import {
  BIOMARKER_LABELS,
  UNIT_OPTIONS,
  draftErrors,
  type DraftReading,
} from "@/lib/client/walkthrough";
import type { BiomarkerId, ReferenceRange } from "@/lib/domain/types";
import { isSupportedUnit } from "@/lib/domain/units";

const ISSUE_TEXT: Record<string, string> = {
  missing_unit: "No unit printed in the report",
  unsupported_unit: "Unit in the report isn't supported",
  conflicting_duplicate: "The report lists this test more than once with different values",
  missing_value: "No value printed in the report",
};

function formatRange(r: ReferenceRange): string {
  const span =
    r.low !== null && r.high !== null ? `${r.low}–${r.high}` : r.low !== null ? `above ${r.low}` : `below ${r.high}`;
  const sex = r.sex ? `${r.sex === "female" ? "Female" : "Male"} ` : "";
  return `${sex}${span} ${r.unit}`.trim();
}

const inputClass =
  "w-full rounded-lg border bg-white px-3 py-2 text-lg tabular-nums text-ink placeholder:text-ink-muted/60";

export function ExtractionReview() {
  const { state, dispatch } = useWalkthrough();
  // Blank manual rows only show their error once the person has worked on them.
  const [touched, setTouched] = useState<Set<BiomarkerId>>(new Set());
  const draft = state.draft!;
  const errors = draftErrors(draft);
  const pending = Object.values(errors).filter(Boolean).length;
  const providedCount = draft.filter((r) => r.provided).length;
  const manual = state.draftSource === "manual";

  const edit = (id: BiomarkerId, patch: Partial<Omit<DraftReading, "id">>) => {
    setTouched((t) => new Set(t).add(id));
    dispatch({ type: "editDraft", id, patch });
  };

  return (
    <section aria-labelledby="review-heading" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id="review-heading" className="font-display text-2xl text-teal">
          Review your biomarkers
        </h3>
        {state.collectedOn && <p className="text-ink-muted">Collected {state.collectedOn}</p>}
      </div>
      {state.parseNotice && <p className="mt-2 text-ink-muted">{state.parseNotice}</p>}
      {manual && (
        <p className="mt-2 max-w-3xl text-ink-muted">
          Copy each result and the lab range printed beside it. Most decisions need the range from your report;
          without it that nutrient goes to clinician review.
        </p>
      )}

      <div className="relative mt-6 overflow-x-auto rounded-2xl border border-ink/10 bg-white/70">
        <table className="w-full min-w-[56rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink/10 text-sm text-ink-muted">
              <th scope="col" className="px-5 py-3 font-semibold">Test</th>
              <th scope="col" className="w-36 px-3 py-3 font-semibold">Value</th>
              <th scope="col" className="w-36 px-3 py-3 font-semibold">Unit</th>
              <th scope="col" className="px-3 py-3 font-semibold">Lab range</th>
              <th scope="col" className="w-40 px-5 py-3 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row) => (
              <ReviewRow
                key={row.id}
                row={row}
                error={manual && !touched.has(row.id) && row.valueText === "" ? null : errors[row.id]}
                onEdit={(patch) => edit(row.id, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {state.unsupportedAnalytes.length > 0 && (
        <div className="mt-5 text-ink-muted">
          <p>Also in the report, not used by this prototype:</p>
          <ul aria-label="Tests in the report that are not used" className="mt-1 flex flex-wrap gap-2">
            {state.unsupportedAnalytes.map((name) => (
              <li key={name} className="rounded-full border border-ink/15 px-3 py-1 text-sm">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          type="button"
          disabled={pending > 0}
          onClick={() => dispatch({ type: "confirmDraft" })}
          className="rounded-full bg-teal px-7 py-3.5 text-lg font-semibold text-ivory transition-colors hover:bg-teal/90 disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink-muted"
        >
          Confirm biomarkers
        </button>
        <p className="text-ink-muted" aria-live="polite">
          {pending > 0
            ? `${pending} ${pending === 1 ? "test needs" : "tests need"} attention before you continue.`
            : providedCount < 5
              ? `${5 - providedCount} not provided: the analysis will be marked incomplete.`
              : "All five tests are ready."}
        </p>
      </div>
    </section>
  );
}

function ReviewRow({
  row,
  error,
  onEdit,
}: {
  row: DraftReading;
  error: string | null;
  onEdit(patch: Partial<Omit<DraftReading, "id">>): void;
}) {
  const label = BIOMARKER_LABELS[row.id];
  const errorId = `${row.id}-error`;
  const unitOptions = UNIT_OPTIONS[row.id];
  const unitKnown = isSupportedUnit(row.id, row.unit);
  const issues = row.issues.filter((i) => ISSUE_TEXT[i]);

  return (
    <tr className={"border-b border-ink/5 align-top last:border-0 " + (error ? "bg-danger-soft/40" : "")}>
      <th scope="row" className="px-5 py-4 font-semibold text-ink">
        <span className="text-lg">{label}</span>
        {issues.map((i) => (
          <span key={i} className="mt-1 block text-sm font-medium text-amber-ink">
            {ISSUE_TEXT[i]}
          </span>
        ))}
        {error && (
          <span id={errorId} className="mt-1 block text-sm font-medium text-danger">
            {error}
          </span>
        )}
      </th>

      {!row.provided ? (
        <>
          <td colSpan={3} className="px-3 py-4 text-ink-muted">
            Not provided. The analysis will be incomplete without it.
          </td>
          <td className="px-5 py-4">
            <button
              type="button"
              onClick={() => onEdit({ provided: true, valueText: "" })}
              aria-label={`Add value for ${label}`}
              className="rounded-full border border-teal px-4 py-1.5 font-semibold text-teal hover:bg-teal hover:text-ivory"
            >
              Add value
            </button>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-4">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label={`${label} value`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              value={row.valueText}
              onChange={(e) => onEdit({ valueText: e.target.value })}
              className={inputClass + (error ? " border-danger" : " border-ink/20")}
            />
            {row.candidates.length > 0 && row.issues.includes("conflicting_duplicate") && (
              <div role="group" aria-label={`Values found for ${label}`} className="mt-2 flex flex-wrap gap-2">
                {row.candidates.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onEdit({ valueText: String(c) })}
                    className="rounded-full border border-teal/40 px-3 py-1 text-sm font-semibold text-teal hover:border-teal"
                  >
                    Use {c}
                  </button>
                ))}
              </div>
            )}
          </td>
          <td className="px-3 py-4">
            <select
              aria-label={`${label} unit`}
              value={row.unit}
              onChange={(e) => onEdit({ unit: e.target.value })}
              className={inputClass + (unitKnown ? " border-ink/20" : " border-danger")}
            >
              {!unitKnown && <option value={row.unit}>{row.unit ? `${row.unit} (not supported)` : "Choose unit"}</option>}
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </td>
          <td className="px-3 py-4">
            {row.ranges.length > 0 ? (
              <p className="py-2 text-lg tabular-nums text-ink">
                {row.ranges.map(formatRange).join("; ")}
                <span className="block text-sm text-ink-muted">From your report</span>
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${label} lab range low`}
                  placeholder="Low"
                  value={row.rangeLowText}
                  onChange={(e) => onEdit({ rangeLowText: e.target.value })}
                  className={inputClass + " border-ink/20"}
                />
                <span aria-hidden className="text-ink-muted">–</span>
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${label} lab range high`}
                  placeholder="High"
                  value={row.rangeHighText}
                  onChange={(e) => onEdit({ rangeHighText: e.target.value })}
                  className={inputClass + " border-ink/20"}
                />
              </div>
            )}
          </td>
          <td className="px-5 py-4">
            <button
              type="button"
              onClick={() => onEdit({ provided: false })}
              aria-label={`Mark ${label} as not provided`}
              className="py-1.5 text-sm font-semibold text-ink-muted underline underline-offset-4 hover:text-teal"
            >
              Not provided
            </button>
          </td>
        </>
      )}
    </tr>
  );
}
