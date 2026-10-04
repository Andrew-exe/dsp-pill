import { describe, expect, it } from "vitest";
import {
  UnsupportedUnitError,
  canonicalRange,
  isSupportedUnit,
  iuToMcgVitaminD,
  mcgToIuVitaminD,
  toCanonical,
} from "@/lib/domain/units";

describe("toCanonical", () => {
  it("converts vitamin D nmol/L to ng/mL", () => {
    expect(toCanonical("vitaminD", 45, "nmol/L")).toBeCloseTo(18.03, 2);
  });
  it("converts B12 pmol/L to pg/mL", () => {
    expect(toCanonical("b12", 354, "pmol/L")).toBeCloseTo(479.67, 2);
  });
  it("converts folate nmol/L to ng/mL", () => {
    expect(toCanonical("folate", 14.73, "nmol/L")).toBeCloseTo(6.5, 2);
  });
  it("treats ferritin ug/L variants as ng/mL", () => {
    expect(toCanonical("ferritin", 62, "µg/L")).toBe(62);
    expect(toCanonical("ferritin", 62, "ug/L")).toBe(62);
    expect(toCanonical("ferritin", 62, "mcg/L")).toBe(62);
  });
  it("converts magnesium units", () => {
    expect(toCanonical("magnesium", 1.9, "mg/dL")).toBeCloseTo(0.78166, 5);
    expect(toCanonical("magnesium", 1.56, "mEq/L")).toBe(0.78);
  });
  it("matches case-insensitively and ignores whitespace", () => {
    expect(toCanonical("vitaminD", 18, "NG/ML ")).toBe(18);
    expect(toCanonical("vitaminD", 18, " ng / mL")).toBe(18);
  });
  it("throws UnsupportedUnitError for unsupported units", () => {
    expect(() => toCanonical("b12", 1, "mg/dL")).toThrow(UnsupportedUnitError);
  });
});

describe("isSupportedUnit", () => {
  it("accepts canonical and convertible units only", () => {
    expect(isSupportedUnit("b12", "pmol/L")).toBe(true);
    expect(isSupportedUnit("b12", "pg/mL")).toBe(true);
    expect(isSupportedUnit("b12", "furlongs")).toBe(false);
    expect(isSupportedUnit("magnesium", "mg/dL")).toBe(true);
  });
});

describe("vitamin D IU/mcg", () => {
  it("converts both ways", () => {
    expect(iuToMcgVitaminD(600)).toBe(15);
    expect(mcgToIuVitaminD(15)).toBe(600);
  });
});

describe("canonicalRange", () => {
  it("converts both bounds and keeps sex", () => {
    const r = canonicalRange("b12", { low: 148, high: 664, unit: "pmol/L", sex: "female" });
    expect(r.unit).toBe("pg/mL");
    expect(r.low).toBeCloseTo(200.54, 2);
    expect(r.high).toBeCloseTo(899.72, 2);
    expect(r.sex).toBe("female");
  });
  it("keeps null bounds", () => {
    const r = canonicalRange("folate", { low: null, high: 20, unit: "ng/mL" });
    expect(r).toEqual({ low: null, high: 20, unit: "ng/mL" });
  });
});
