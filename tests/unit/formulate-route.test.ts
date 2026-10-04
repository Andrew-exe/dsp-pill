import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/formulate/route";
import { PRIMARY_V1_BIOMARKERS, buildInput } from "@/fixtures/scenarios";

function req(body: string) {
  return new Request("http://localhost/api/formulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/formulate", () => {
  it("returns the assessment for the primary input", async () => {
    const res = await POST(req(JSON.stringify(buildInput(PRIMARY_V1_BIOMARKERS))));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ready");
    expect(json.formulation.items.map((i: { nutrient: string }) => i.nutrient)).toEqual(["vitaminD", "b12", "magnesium"]);
  });

  it("rejects invalid JSON", async () => {
    const res = await POST(req("{"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("reports unsupported unit paths", async () => {
    const input = buildInput(PRIMARY_V1_BIOMARKERS);
    const bad = { ...input, biomarkers: input.biomarkers.map((b, i) => (i === 0 ? { ...b, unit: "furlongs" } : b)) };
    const res = await POST(req(JSON.stringify(bad)));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation_failed");
    expect(json.fieldErrors.map((f: { path: string }) => f.path)).toContain("biomarkers.0.unit");
  });

  it("reports missing profile", async () => {
    const rest: Record<string, unknown> = { ...buildInput(PRIMARY_V1_BIOMARKERS) };
    delete rest.profile;
    const res = await POST(req(JSON.stringify(rest)));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.map((f: { path: string }) => f.path)).toContain("profile");
  });

  it("non-object body yields empty path", async () => {
    const res = await POST(req("[]"));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors[0].path).toBe("");
  });
});
