"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createLatestOnlyRequester } from "@/lib/client/formulateClient";
import {
  initialState,
  walkthroughReducer,
  type WalkthroughAction,
  type WalkthroughState,
} from "@/lib/client/walkthrough";

export interface WalkthroughContextValue {
  state: WalkthroughState;
  dispatch(action: WalkthroughAction): void;
  /** Requests a fresh assessment for the current inputs; stale responses are dropped. */
  requestAssessment(input?: "primary" | "followUp"): void;
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  // Mirrors the latest state synchronously so requestAssessment sees changes dispatched in the same handler.
  const stateRef = useRef(state);
  const requesters = useRef<Record<"primary" | "followUp", ReturnType<typeof createLatestOnlyRequester>> | null>(null);

  const dispatch = useCallback((action: WalkthroughAction) => {
    if (action.type === "reset") {
      requesters.current?.primary.cancel();
      requesters.current?.followUp.cancel();
    }
    stateRef.current = walkthroughReducer(stateRef.current, action);
    setState(stateRef.current);
  }, []);

  const requestAssessment = useCallback(
    (kind: "primary" | "followUp" = "primary") => {
      requesters.current ??= { primary: createLatestOnlyRequester(), followUp: createLatestOnlyRequester() };
      const current = stateRef.current;
      const biomarkers = kind === "primary" ? current.biomarkers : current.followUp?.biomarkers;
      if (!biomarkers) return;
      const inputVersion = current.inputVersion;
      if (kind === "primary") dispatch({ type: "resultLoading" });

      void requesters.current[kind]
        .request({ biomarkers, profile: current.profile, supplements: current.supplements })
        .then((outcome) => {
          if (outcome.kind === "stale") return;
          if (kind === "primary") {
            dispatch(
              outcome.kind === "result"
                ? { type: "resultReceived", result: outcome.result, inputVersion }
                : { type: "resultFailed", message: outcome.message, inputVersion },
            );
          } else {
            dispatch(
              outcome.kind === "result"
                ? { type: "followUpReceived", result: outcome.result, inputVersion }
                : { type: "followUpFailed", message: outcome.message, inputVersion },
            );
          }
        });
    },
    [dispatch],
  );

  const value = useMemo(() => ({ state, dispatch, requestAssessment }), [state, dispatch, requestAssessment]);
  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

export function useWalkthrough(): WalkthroughContextValue {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) throw new Error("useWalkthrough must be used inside <WalkthroughProvider>");
  return ctx;
}
