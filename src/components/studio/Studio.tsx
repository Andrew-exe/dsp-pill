"use client";

import { useEffect, useRef } from "react";
import { BiomarkersStage } from "@/components/biomarkers/BiomarkersStage";
import { ContextStage } from "@/components/context/ContextStage";
import { FormulaStage } from "@/components/formula/FormulaStage";
import { NextStage } from "@/components/next/NextStage";
import { StartStage } from "@/components/intake/StartStage";
import { DisclaimerBanner } from "@/components/shell/DisclaimerBanner";
import { StageNav, type StageId } from "@/components/shell/StageNav";
import { reachableStages } from "@/lib/client/walkthrough";
import { WalkthroughProvider, useWalkthrough } from "./WalkthroughProvider";

export function Studio() {
  return (
    <WalkthroughProvider>
      <DisclaimerBanner />
      <StudioBody />
    </WalkthroughProvider>
  );
}

function StudioBody() {
  const { state, dispatch } = useWalkthrough();
  const stageRef = useRef<HTMLDivElement>(null);
  const previousStage = useRef<StageId>(state.stage);

  // Move focus to the new stage heading so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (previousStage.current === state.stage) return;
    previousStage.current = state.stage;
    stageRef.current?.querySelector<HTMLElement>("h2")?.focus();
    window.scrollTo({ top: 0 });
  }, [state.stage]);

  return (
    <>
      <header className="mx-auto max-w-5xl px-6 pt-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-teal sm:text-5xl">dsp-pill</h1>
        <p className="mt-2 text-lg text-ink-muted">
          Personalized Formulation Studio: from bloodwork to a simulated daily sachet, offline.
        </p>
      </header>
      <StageNav
        current={state.stage}
        reachable={reachableStages(state)}
        onSelect={(stage) => dispatch({ type: "goTo", stage })}
      />
      <main ref={stageRef} className="mx-auto max-w-5xl px-6 pb-24 pt-4">
        {state.stage === "start" && <StartStage />}
        {state.stage === "context" && <ContextStage />}
        {state.stage === "biomarkers" && <BiomarkersStage />}
        {state.stage === "formula" && <FormulaStage />}
        {state.stage === "next" && <NextStage />}
      </main>
    </>
  );
}
