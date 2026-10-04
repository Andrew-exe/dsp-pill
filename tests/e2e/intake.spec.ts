import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { trackExternalRequests } from "./helpers";

const V1_PDF = path.join(process.cwd(), "public/reports/dsp-pill-synthetic-report-v1.pdf");
const SCANNED_PDF = path.join(process.cwd(), "tests/fixtures/pdf/scanned.pdf");

const review = (page: Page) => page.getByRole("region", { name: "Review your biomarkers" });
const valueInput = (page: Page, label: string) => review(page).getByLabel(`${label} value`, { exact: true });

async function upload(page: Page, file: string) {
  await page.getByLabel("Upload a lab report PDF").setInputFiles(file);
}

test("uploading the synthetic report fills the review table", async ({ page }) => {
  const external = trackExternalRequests(page);
  await page.goto("/");
  await upload(page, V1_PDF);

  await expect(review(page)).toBeVisible();
  await expect(valueInput(page, "25-OH Vitamin D")).toHaveValue("18");
  await expect(valueInput(page, "Vitamin B12")).toHaveValue("480");
  await expect(valueInput(page, "Folate")).toHaveValue("6.5");
  await expect(valueInput(page, "Ferritin")).toHaveValue("62");
  await expect(valueInput(page, "Magnesium")).toHaveValue("0.78");

  const notUsed = page.getByRole("list", { name: "Tests in the report that are not used" });
  await expect(notUsed).toContainText("Hemoglobin");
  await expect(notUsed).toContainText("TSH");

  const confirm = page.getByRole("button", { name: "Confirm biomarkers" });
  await expect(confirm).toBeEnabled();
  await valueInput(page, "25-OH Vitamin D").fill("");
  await expect(confirm).toBeDisabled();
  await expect(review(page).getByText("Enter a value, or mark this test as not provided.")).toBeVisible();

  await valueInput(page, "25-OH Vitamin D").fill("-1");
  await expect(review(page).getByText("The value can't be negative.")).toBeVisible();
  await expect(confirm).toBeDisabled();

  await valueInput(page, "25-OH Vitamin D").fill("18");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("heading", { name: "Your Context", level: 2 })).toBeVisible();
  expect(external()).toEqual([]);
});

test("a scanned PDF explains the limitation and offers manual entry, never fixture data", async ({ page }) => {
  const external = trackExternalRequests(page);
  await page.goto("/");
  await upload(page, SCANNED_PDF);

  const alert = page.getByRole("alert").filter({ hasText: "scanned or image-only PDF" });
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Enter manually" })).toBeVisible();
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: /value$/ })).toHaveCount(0);
  expect(external()).toEqual([]);
});

test("manual entry plus the synthetic profile reaches Your Biomarkers", async ({ page }) => {
  const external = trackExternalRequests(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Enter manually" }).first().click();

  await expect(review(page)).toBeVisible();
  for (const label of ["25-OH Vitamin D", "Vitamin B12", "Folate", "Ferritin", "Magnesium"]) {
    await expect(valueInput(page, label)).toHaveValue("");
  }
  const confirm = page.getByRole("button", { name: "Confirm biomarkers" });
  await expect(confirm).toBeDisabled();

  await valueInput(page, "25-OH Vitamin D").fill("18");
  await valueInput(page, "Vitamin B12").fill("480");
  await valueInput(page, "Folate").fill("6.5");
  await valueInput(page, "Ferritin").fill("62");
  await valueInput(page, "Magnesium").fill("0.78");
  await review(page).getByLabel("25-OH Vitamin D lab range low").fill("20");
  await review(page).getByLabel("25-OH Vitamin D lab range high").fill("50");
  await confirm.click();

  await expect(page.getByRole("heading", { name: "Your Context", level: 2 })).toBeVisible();
  await expect(page.getByText("0 of 7 answered")).toBeVisible();
  await page.getByRole("button", { name: "Fill synthetic profile" }).click();
  await expect(page.getByText("7 of 7 answered")).toBeVisible();
  await expect(page.getByLabel("Age", { exact: true })).toHaveValue("32");

  await page.getByRole("button", { name: "See my analysis" }).click();
  const nav = page.getByRole("navigation", { name: "Walkthrough stages" });
  await expect(nav.getByRole("button", { name: /Your Biomarkers/ })).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "Your Biomarkers", level: 2 })).toBeVisible();
  expect(external()).toEqual([]);
});

test("load synthetic patient fills the review and the context form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load synthetic patient" }).click();
  await expect(valueInput(page, "25-OH Vitamin D")).toHaveValue("18");
  await page.getByRole("button", { name: "Confirm biomarkers" }).click();
  await expect(page.getByText("7 of 7 answered")).toBeVisible();
});
