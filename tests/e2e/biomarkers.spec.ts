import { expect, test } from "@playwright/test";
import { goToAnalysis, trackExternalRequests } from "./helpers";

const amount = (page: import("@playwright/test").Page, n: string) => page.getByTestId(`formula-amount-${n}`);

test("biomarker cards show the fixed demonstration amounts and no score or percent", async ({ page }) => {
  const external = trackExternalRequests(page);
  await goToAnalysis(page);

  await expect(amount(page, "vitaminD")).toHaveText("600 IU / 15 mcg");
  await expect(amount(page, "b12")).toHaveText("25 mcg");
  await expect(amount(page, "magnesium")).toHaveText("100 mg");
  await expect(amount(page, "folicAcid")).toHaveText("—");
  await expect(page.getByTestId("biomarker-card-ferritin")).toContainText("iron");
  await expect(page.getByTestId("biomarker-card-magnesium")).toContainText("whole-body");
  await expect(page.getByTestId("biomarker-card-vitaminD").getByRole("img")).toHaveAttribute("aria-label", /Lab range 20 to 50/);

  const text = await page.locator("main").innerText();
  expect(text).not.toMatch(/score/i);
  expect(text).not.toContain("%");
  expect(external()).toEqual([]);
});

test("Try a change re-evaluates the amounts", async ({ page }) => {
  await goToAnalysis(page);
  const dInput = page.getByLabel("Vitamin D value", { exact: true });

  await dInput.fill("25");
  await expect(amount(page, "vitaminD")).toHaveText("—");
  await expect(page.getByTestId("biomarker-card-vitaminD").getByText("Not included", { exact: true })).toBeVisible();

  await dInput.fill("18");
  await expect(amount(page, "vitaminD")).toHaveText("600 IU / 15 mcg");

  await page.getByLabel("Diet", { exact: true }).selectOption("omnivore");
  await expect(amount(page, "b12")).toHaveText("—");
  await page.getByLabel("Diet", { exact: true }).selectOption("vegan");
  await expect(amount(page, "b12")).toHaveText("25 mcg");

  await page.getByLabel("Existing Vitamin D3 supplement").selectOption("0");
  await expect(amount(page, "vitaminD")).toHaveText("1,000 IU / 25 mcg");
  await page.getByLabel("Existing Vitamin D3 supplement").selectOption("400");

  await page.getByLabel("Yes", { exact: true }).check({ force: true });
  await expect(page.getByTestId("review-notice")).toBeVisible();
  for (const n of ["vitaminD", "b12", "magnesium", "folicAcid"]) await expect(amount(page, n)).toHaveText("—");
});

test("rapid edits end on the last value", async ({ page }) => {
  await goToAnalysis(page);
  const dInput = page.getByLabel("Vitamin D value", { exact: true });
  await dInput.fill("15");
  await dInput.fill("30");
  await dInput.fill("18");
  await expect(amount(page, "vitaminD")).toHaveText("600 IU / 15 mcg");
  await page.waitForTimeout(500);
  await expect(amount(page, "vitaminD")).toHaveText("600 IU / 15 mcg");
});

test("changing context after the analysis never shows stale amounts", async ({ page }) => {
  await goToAnalysis(page);
  const nav = page.getByRole("navigation", { name: "Walkthrough stages" });
  await nav.getByRole("button", { name: /Your Context/ }).click();
  await page.getByLabel("Age", { exact: true }).fill("70");
  await nav.getByRole("button", { name: /Your Biomarkers/ }).click();
  await expect(page.getByTestId("review-notice")).toBeVisible();
  await expect(page.getByTestId("review-notice")).toContainText("18 to 65");
  await expect(amount(page, "vitaminD")).toHaveText("—");
});
