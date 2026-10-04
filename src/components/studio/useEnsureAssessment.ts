"use client";

import { useEffect } from "react";
import { useWalkthrough } from "./WalkthroughProvider";

/**
 * Whenever inputs were invalidated and nothing is in flight (an edit, or a re-confirm after returning to a stage),
 * ask for a fresh result. The short delay lets a slider drag settle into one request; the last value is sent.
 * A loaded follow-up is refreshed the same way, so Formula v2 is never stale when the user returns to it.
 */
export function useEnsureAssessment(): void {
  const { state, requestAssessment } = useWalkthrough();
  const { biomarkers, result, resultState } = state;
  useEffect(() => {
    if (!biomarkers || result !== null || resultState !== "idle") return;
    const timer = setTimeout(() => requestAssessment(), 150);
    return () => clearTimeout(timer);
  }, [biomarkers, result, resultState, requestAssessment]);

  const followUp = state.followUp;
  const followUpBiomarkers = followUp?.biomarkers ?? null;
  const followUpOpen = followUp !== null && followUp.result === null && followUp.error === null;
  const { followUpVersion } = state;
  useEffect(() => {
    if (!followUpBiomarkers || !followUpOpen) return;
    const timer = setTimeout(() => requestAssessment("followUp"), 150);
    return () => clearTimeout(timer);
  }, [followUpBiomarkers, followUpOpen, followUpVersion, requestAssessment]);
}
