"use client";

import { useEffect } from "react";
import { useWalkthrough } from "./WalkthroughProvider";

/**
 * Whenever inputs were invalidated and nothing is in flight (an edit, or a re-confirm after returning to a stage),
 * ask for a fresh result. The short delay lets a slider drag settle into one request; the last value is sent.
 */
export function useEnsureAssessment(): void {
  const { state, requestAssessment } = useWalkthrough();
  const { biomarkers, result, resultState } = state;
  useEffect(() => {
    if (!biomarkers || result !== null || resultState !== "idle") return;
    const timer = setTimeout(() => requestAssessment(), 150);
    return () => clearTimeout(timer);
  }, [biomarkers, result, resultState, requestAssessment]);
}
