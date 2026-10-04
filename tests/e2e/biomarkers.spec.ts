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

  // Supporting detail sits one click away in a closed, keyboard-reachable disclosure.
  const vitD = page.getByTestId("biomarker-card-vitaminD");
  await expect(vitD).toContainText("Demo band");
  await expect(vitD.getByText("Clinical context")).toBeHidden();
  await vitD.getByText("Why this amount?").focus();
  await page.keyboard.press("Enter");
  await expect(vitD.getByText("Clinical context")).toBeVisible();
  await expect(vitD.getByText("Existing supplement, per day")).toBeVisible();
  await expect(vitD.getByText("Combined daily amount")).toBeVisible();

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

test("a slow response for an earlier edit never overwrites the last one", async ({ page }) => {
  await goToAnalysis(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let eighteenDelivered = false;
  await page.route("**/api/formulate", async (route) => {
    const body = route.request().postDataJSON() as { biomarkers: { id: string; value: number }[] };
    const d = body.biomarkers.find((b) => b.id === "vitaminD")!.value;
    try {
      const response = await route.fetch();
      if (d === 30) await gate; // the 30 response is held back until the 18 one has been delivered
      await route.fulfill({ response });
      if (d === 18) {
        eighteenDelivered = true;
        release();
      }
    } catch {
      // The browser aborted a superseded request: nothing to deliver.
    }
  });

  const dInput = page.getByLabel("Vitamin D value", { exact: true });
  // Each edit is separated by more than the debounce so every value is really sent.
  await dInput.fill("15");
  await page.waitForTimeout(300);
  await dInput.fill("30");
  await page.waitForTimeout(300);
  await dInput.fill("18");
  await expect(amount(page, "vitaminD")).toHaveText("600 IU / 15 mcg");
  expect(eighteenDelivered).toBe(true);
  await page.waitForTimeout(800); // the held 30 response is released now
  await expect(amount(page, "vitaminD")).toHaveText("600 IU / 15 mcg");
});

test("an edit hides the old amounts until the fresh result arrives", async ({ page }) => {
  await goToAnalysis(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/api/formulate", async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByLabel("Vitamin D value", { exact: true }).fill("25");
  await expect(amount(page, "vitaminD")).toHaveText("Updating…");
  await expect(amount(page, "b12")).toHaveText("Updating…");
  await expect(page.getByTestId("biomarker-card-vitaminD")).toHaveAttribute("aria-busy", "true");
  release();
  await expect(amount(page, "vitaminD")).toHaveText("—");
  await expect(page.getByTestId("biomarker-card-vitaminD")).toHaveAttribute("aria-busy", "false");
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

test("an unresolved supplements answer cannot be turned into an answer by Try a change", async ({ page }) => {
  await goToAnalysis(page);
  const nav = page.getByRole("navigation", { name: "Walkthrough stages" });
  await nav.getByRole("button", { name: /Your Context/ }).click();
  await page.getByRole("group", { name: /Existing supplements/ }).getByText("Unknown", { exact: true }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await expect(page.getByTestId("review-notice")).toBeVisible();
  const select = page.getByLabel("Existing Vitamin D3 supplement");
  await expect(select).toBeDisabled();
  await expect(page.getByText("Answer the supplements question in Your Context to try this.")).toBeVisible();
  await expect(page.getByTestId("review-notice")).toBeVisible();
  await expect(page.getByTestId("formula-amount-vitaminD")).toHaveText("—");
});

test("a negative supplement amount is treated as unknown and goes to review, not an error", async ({ page }) => {
  await goToAnalysis(page);
  const nav = page.getByRole("navigation", { name: "Walkthrough stages" });
  await nav.getByRole("button", { name: /Your Context/ }).click();
  await page.getByLabel("Supplement 1 amount per dose").fill("-5");
  await page.getByRole("button", { name: "See my analysis" }).click();
  await expect(page.getByTestId("review-notice")).toBeVisible();
  await expect(page.getByText("The analysis could not be calculated.")).toHaveCount(0);
});
