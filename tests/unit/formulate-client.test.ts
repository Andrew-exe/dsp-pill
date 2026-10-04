import { describe, expect, it } from "vitest";
import { createLatestOnlyRequester } from "@/lib/client/formulateClient";
import { PRIMARY_V1_BIOMARKERS, buildInput } from "@/fixtures/scenarios";
import { assess } from "@/lib/assess";

const input = buildInput(PRIMARY_V1_BIOMARKERS);
const ok = () => Response.json(assess(input));

function deferredFetch() {
  const pending: { resolve: (r: Response) => void; reject: (e: unknown) => void; signal: AbortSignal; init: RequestInit }[] = [];
  const fetchImpl = ((_url: string, init: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      pending.push({ resolve, reject, signal: init.signal as AbortSignal, init });
    })) as unknown as typeof fetch;
  return { pending, fetchImpl };
}

describe("createLatestOnlyRequester", () => {
  it("marks an earlier request stale even if it resolves after the latest", async () => {
    const { pending, fetchImpl } = deferredFetch();
    const r = createLatestOnlyRequester(fetchImpl);
    const a = r.request(input);
    const b = r.request(input);
    pending[1].resolve(ok());
    pending[0].resolve(ok());
    expect((await b).kind).toBe("result");
    expect(await a).toEqual({ kind: "stale" });
    expect(pending[0].signal.aborted).toBe(true);
    expect(pending[0].init.method).toBe("POST");
  });

  it("resolves stale when the fetch rejects due to abort", async () => {
    const { pending, fetchImpl } = deferredFetch();
    const r = createLatestOnlyRequester(fetchImpl);
    const a = r.request(input);
    pending[0].signal.addEventListener("abort", () => pending[0].reject(new DOMException("aborted", "AbortError")));
    r.cancel();
    expect(await a).toEqual({ kind: "stale" });
  });

  it("returns field errors on 400", async () => {
    const fieldErrors = [{ path: "profile", message: "Required" }];
    const r = createLatestOnlyRequester((async () =>
      Response.json({ error: "validation_failed", fieldErrors }, { status: 400 })) as unknown as typeof fetch);
    const res = await r.request(input);
    expect(res).toMatchObject({ kind: "error", fieldErrors });
  });

  it("returns error on other non-2xx and network rejection", async () => {
    const r1 = createLatestOnlyRequester((async () => Response.json({ error: "internal_error" }, { status: 500 })) as unknown as typeof fetch);
    const e1 = await r1.request(input);
    expect(e1.kind).toBe("error");
    expect((e1 as { fieldErrors?: unknown }).fieldErrors).toBeUndefined();
    const r2 = createLatestOnlyRequester((async () => { throw new TypeError("network"); }) as unknown as typeof fetch);
    expect((await r2.request(input)).kind).toBe("error");
  });
});
