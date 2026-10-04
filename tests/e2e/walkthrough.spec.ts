import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { trackExternalRequests } from "./helpers";

const V1_PDF = path.join(process.cwd(), "public/reports/dsp-pill-synthetic-report-v1.pdf");
const nav = (page: Page) => page.getByRole("navigation", { name: "Walkthrough stages" });
const NUTRIENTS = ["vitaminD", "b12", "folicAcid", "magnesium"];

/** Pulls "600 IU" / "15 mcg" style quantities out of any text, sorted for set comparison. */
const quantities = (text: string) =>
  [...text.matchAll(/(\d[\d,.]*)\s*(IU|mcg|mg)\b/g)].map((m) => `${m[1]} ${m[2]}`).sort();

async function stage(page: Page, heading: string) {
  await page.getByRole("heading", { name: heading, level: 2 }).waitFor();
}

/** The whole primary path: upload v1 PDF, confirm, profile, analysis, formula, simulation, v2. */
async function runWalkthrough(page: Page) {
  await page.goto("/");
  await page.getByLabel("Upload a lab report PDF").setInputFiles(V1_PDF);
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await stage(page, "Your Context");
  await page.getByRole("button", { name: "Fill synthetic profile" }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await stage(page, "Your Biomarkers");
  await page.getByTestId("formula-amount-vitaminD").waitFor();
  await expect(page.getByTestId("formula-amount-vitaminD")).not.toHaveText(/Updating/);

  const cardAmounts: string[] = [];
  for (const n of NUTRIENTS) cardAmounts.push(await page.getByTestId(`formula-amount-${n}`).innerText());

  await page.getByRole("button", { name: "See my formula" }).click();
  await stage(page, "Your Formula");
  const label = await page.getByTestId("sachet-label").innerText();
  await page.getByRole("button", { name: "Simulate manufacturing" }).click();
  const dialog = page.getByRole("dialog");
  const spec = (await dialog.getByTestId("order-spec").innerText());
  for (const step of ["Simulated blending", "Simulated packaging", "Demo confirmation"]) {
    await dialog.getByRole("button", { name: "Next" }).click();
    await expect(dialog.getByRole("heading", { name: step })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await nav(page).getByRole("button", { name: /Your Next Formula/ }).click();
  await stage(page, "Your Next Formula");
  await page.getByRole("button", { name: "Load 8-week follow-up report (synthetic)" }).click();
  await page.getByTestId("comparison-table").waitFor();
  await expect(page.getByTestId("sachet-label").nth(1)).toContainText("Vitamin B12 25 mcg");

  return { cards: cardAmounts.join(" "), label, spec };
}

test("full primary walkthrough completes with identical quantities and no external requests", async ({ page }) => {
  const external = trackExternalRequests(page);
  const started = Date.now();
  const { cards, label, spec } = await runWalkthrough(page);
  console.log(`WALKTHROUGH_MS=${Date.now() - started}`);

  const expected = ["100 mg", "15 mcg", "25 mcg", "600 IU"];
  expect(quantities(cards)).toEqual(expected);
  expect(quantities(label)).toEqual(expected);
  expect(quantities(spec)).toEqual(expected);
  expect(external()).toEqual([]);
});

test("the walkthrough completes with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { label } = await runWalkthrough(page);
  expect(quantities(label)).toEqual(["100 mg", "15 mcg", "25 mcg", "600 IU"]);
});

test("Reset returns to Start with no draft and no result", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load synthetic patient" }).click();
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await stage(page, "Your Biomarkers");
  await page.getByTestId("formula-amount-vitaminD").waitFor();
  await page.getByRole("button", { name: "See my formula" }).click();
  await stage(page, "Your Formula");

  const reset = page.getByRole("button", { name: "Reset demo" });
  await expect(reset).toBeVisible();
  await reset.click();
  const heading = page.getByRole("heading", { name: "Your Starting Point", level: 2 });
  await expect(heading).toBeFocused();
  await expect(page.getByRole("region", { name: "Review your biomarkers" })).toHaveCount(0);
  await expect(page.getByTestId("sachet-label")).toHaveCount(0);
  await expect(nav(page).getByRole("button", { name: /Your Formula/ })).toBeDisabled();
  await expect(nav(page).getByRole("button", { name: /Your Biomarkers/ })).toBeDisabled();

  // Reset from the Start stage with a draft loaded also clears the draft and keeps focus on the heading.
  await page.getByLabel("Upload a lab report PDF").setInputFiles(V1_PDF);
  await expect(page.getByRole("region", { name: "Review your biomarkers" })).toBeVisible();
  await reset.click();
  await expect(page.getByRole("region", { name: "Review your biomarkers" })).toHaveCount(0);
  await expect(heading).toBeFocused();
});

test("keyboard-only: Tab reaches 'Load synthetic patient' and Enter activates it", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (name === "Load synthetic patient") break;
  }
  await expect(page.getByRole("button", { name: "Load synthetic patient" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Review your biomarkers" })).toBeVisible();
});

test("no horizontal page scroll at 400px on any stage", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth);
  await page.goto("/");
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.getByRole("button", { name: "Load synthetic patient" }).click();
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await stage(page, "Your Context");
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.getByRole("button", { name: "See my analysis" }).click();
  await stage(page, "Your Biomarkers");
  await page.getByTestId("formula-amount-vitaminD").waitFor();
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.getByRole("button", { name: "See my formula" }).click();
  await stage(page, "Your Formula");
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.getByRole("button", { name: "Simulate manufacturing" }).click();
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.keyboard.press("Escape");
  await nav(page).getByRole("button", { name: /Your Next Formula/ }).click();
  await stage(page, "Your Next Formula");
  await page.getByRole("button", { name: "Load 8-week follow-up report (synthetic)" }).click();
  await page.getByTestId("comparison-table").waitFor();
  expect(await overflow()).toBeLessThanOrEqual(400);
  await page.goto("/methodology");
  expect(await overflow()).toBeLessThanOrEqual(400);
});

test("sachet title stays on one line at desktop width", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load synthetic patient" }).click();
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await page.getByRole("button", { name: "See my analysis" }).click();
  await page.getByRole("button", { name: "See my formula" }).click();
  const title = page.getByTestId("sachet-title");
  await expect(title).toHaveText("dsp-pill Formula #1842 · v1");
  const lines = await title.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
  expect(lines).toBe(1);
});

test("the methodology note is local, lists the policy and all five NIH sources", async ({ page }) => {
  const external = trackExternalRequests(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Methodology" }).click();
  await expect(page.getByRole("heading", { name: "Methodology note", level: 1 })).toBeVisible();
  const slugs = ["VitaminD", "VitaminB12", "Folate", "Iron", "Magnesium"];
  for (const s of slugs) {
    await expect(page.locator(`a[href="https://ods.od.nih.gov/factsheets/${s}-HealthProfessional/"]`)).toHaveCount(1);
  }
  const body = page.locator("main");
  await expect(body).toContainText("prototype limits, not established clinical upper limits");
  await expect(body).toContainText("do not validate the demo dosing policy");
  await expect(body).toContainText("deterministic-rules");
  await expect(body).toContainText("demo-safety-policy");
  await expect(body).toContainText("max(0, proposed supplemental total");
  await expect(body).toContainText("2,000 IU");
  expect(external()).toEqual([]);
});
