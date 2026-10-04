"use client";

import { useEffect, useRef, useState } from "react";
import { useWalkthrough } from "@/components/studio/WalkthroughProvider";
import { PRIMARY_PROFILE, PRIMARY_SUPPLEMENTS, PRIMARY_V1_BIOMARKERS } from "@/fixtures/scenarios";
import { BIOMARKER_LABELS, draftFromExtraction, draftFromReadings, emptyDraft } from "@/lib/client/walkthrough";
import { PDF_ERROR_MESSAGES, extractPdfTextInBrowser } from "@/lib/pdf/browserPdf";
import { PdfExtractionError } from "@/lib/pdf/extractPdfText";
import { parseReportText } from "@/lib/pdf/parseReportText";
import { ExtractionReview } from "./ExtractionReview";
import { PdfDropzone } from "./PdfDropzone";

const REPORT_LINKS = [
  { href: "/reports/dsp-pill-synthetic-report-v1.pdf", label: "Synthetic report, July (v1)" },
  { href: "/reports/dsp-pill-synthetic-report-week8.pdf", label: "Synthetic report, 8 weeks later" },
  { href: "/reports/dsp-pill-synthetic-report-scenario-b.pdf", label: "Synthetic report, scenario B" },
];

const NO_BIOMARKERS_MESSAGE = `We couldn't find any of the five supported tests (${Object.values(BIOMARKER_LABELS).join(", ")}) in that PDF. You can enter your values manually instead.`;

export function StartStage() {
  const { state, dispatch } = useWalkthrough();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  // Identifies the latest intake choice; a PDF read that finishes after a newer choice is dropped.
  const readToken = useRef(0);
  useEffect(() => () => void readToken.current++, []);

  async function readPdf(file: File) {
    const token = ++readToken.current;
    const isCurrent = () => token === readToken.current;
    setBusy(true);
    setError(null);
    try {
      const { text } = await extractPdfTextInBrowser(file);
      if (!isCurrent()) return;
      const parsed = parseReportText(text);
      if (parsed.readings.length === 0) {
        setError(NO_BIOMARKERS_MESSAGE);
        return;
      }
      setChoosing(false);
      dispatch({
        type: "loadDraft",
        draft: draftFromExtraction(parsed.readings),
        source: "pdf",
        collectedOn: parsed.collectedOn,
        unsupportedAnalytes: parsed.unsupportedAnalytes,
        notice: `Read ${parsed.readings.length} of 5 supported tests from ${file.name}. Check each value against your report before confirming.`,
      });
    } catch (err) {
      if (!isCurrent()) return;
      setError(PDF_ERROR_MESSAGES[err instanceof PdfExtractionError ? err.code : "unreadable"]);
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  function enterManually() {
    readToken.current++;
    setBusy(false);
    setError(null);
    setChoosing(false);
    dispatch({ type: "loadDraft", draft: emptyDraft(), source: "manual", collectedOn: null, notice: null });
  }

  function loadSynthetic() {
    readToken.current++;
    setBusy(false);
    setError(null);
    setChoosing(false);
    dispatch({
      type: "loadDraft",
      draft: draftFromReadings(PRIMARY_V1_BIOMARKERS),
      source: "fixture",
      collectedOn: PRIMARY_V1_BIOMARKERS[0].collectedOn,
      notice: "Loaded synthetic patient SP-1842. Their context is filled in too; you can change anything.",
      profile: PRIMARY_PROFILE,
      supplements: PRIMARY_SUPPLEMENTS,
    });
  }

  const showReview = state.draft !== null && !choosing;

  return (
    <section aria-labelledby="stage-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 id="stage-heading" tabIndex={-1} className="font-display text-4xl font-semibold text-teal outline-none">
            Your Starting Point
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-ink-muted">
            {showReview
              ? "Check what we read before anything is analysed. You can correct any value."
              : "Start from a lab report, type your results in, or explore with a synthetic patient."}
          </p>
        </div>
        {showReview && (
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="rounded-full border border-teal/30 px-5 py-2.5 font-semibold text-teal hover:border-teal"
          >
            Use a different source
          </button>
        )}
      </div>

      {showReview ? (
        <ExtractionReview />
      ) : (
        <div className="mt-10">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <PdfDropzone busy={busy} onFile={readPdf} />
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-teal/20 bg-ivory-deep p-6">
                <p className="font-display text-xl text-teal">Type your results in</p>
                <p className="mt-1 text-ink-muted">Five tests, with the lab ranges printed on your report.</p>
                <button
                  type="button"
                  onClick={enterManually}
                  className="mt-4 rounded-full border border-teal px-5 py-2.5 font-semibold text-teal hover:bg-teal hover:text-ivory"
                >
                  Enter manually
                </button>
              </div>
              <div className="rounded-2xl border border-amber/50 bg-amber-soft/60 p-6">
                <p className="font-display text-xl text-teal">Try the demo patient</p>
                <p className="mt-1 text-ink-muted">A synthetic 32-year-old with a July report and existing Vitamin D.</p>
                <button
                  type="button"
                  onClick={loadSynthetic}
                  className="mt-4 rounded-full bg-teal px-5 py-2.5 font-semibold text-ivory hover:bg-teal/90"
                >
                  Load synthetic patient
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-danger/30 bg-danger-soft p-5">
              <p className="flex-1 basis-80 text-danger">{error}</p>
              <button
                type="button"
                onClick={enterManually}
                className="rounded-full bg-teal px-5 py-2.5 font-semibold text-ivory hover:bg-teal/90"
              >
                Enter manually
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
            <span className="text-ink-muted">No report to hand? Download a synthetic one:</span>
            {REPORT_LINKS.map((r) => (
              <a key={r.href} href={r.href} download className="font-semibold text-teal underline underline-offset-4">
                {r.label}
              </a>
            ))}
          </div>

          {choosing && (
            <button
              type="button"
              onClick={() => setChoosing(false)}
              className="mt-8 font-semibold text-teal underline underline-offset-4"
            >
              Back to your review
            </button>
          )}
        </div>
      )}
    </section>
  );
}
