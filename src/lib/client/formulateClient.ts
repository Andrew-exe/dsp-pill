import type { AssessmentInput } from "@/lib/domain/types";
import type { AssessmentResult } from "@/lib/safety/policy";

export interface FieldError {
  path: string;
  message: string;
}

export type FormulateOutcome =
  | { kind: "result"; result: AssessmentResult }
  | { kind: "error"; message: string; fieldErrors?: FieldError[] }
  | { kind: "stale" };

export function createLatestOnlyRequester(fetchImpl: typeof fetch = (...args) => fetch(...args)) {
  let latest: AbortController | null = null;

  async function request(input: AssessmentInput): Promise<FormulateOutcome> {
    latest?.abort();
    const controller = new AbortController();
    latest = controller;
    const isStale = () => latest !== controller || controller.signal.aborted;

    try {
      const response = await fetchImpl("/api/formulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      if (isStale()) return { kind: "stale" };

      if (response.ok) return { kind: "result", result: payload as AssessmentResult };

      const body = payload as { error?: string; fieldErrors?: FieldError[] } | null;
      if (body?.error === "validation_failed" && Array.isArray(body.fieldErrors)) {
        return { kind: "error", message: "Some inputs need attention.", fieldErrors: body.fieldErrors };
      }
      return { kind: "error", message: "The formulation could not be computed. Please try again." };
    } catch {
      if (isStale()) return { kind: "stale" };
      return { kind: "error", message: "Could not reach the formulation service. Please try again." };
    }
  }

  function cancel() {
    latest?.abort();
    latest = null;
  }

  return { request, cancel };
}
