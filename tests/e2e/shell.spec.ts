import { expect, test } from "@playwright/test";
import { trackExternalRequests } from "./helpers";

const DISCLAIMER =
  "Synthetic demo data · Hackathon prototype · Not medical advice · Formulations are not clinically validated";

test("shell renders offline with disclaimer and stage nav", async ({ page }) => {
  const external = trackExternalRequests(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByText(DISCLAIMER)).toBeVisible();
  await expect(page.locator("h1")).toContainText("dsp-pill");

  const nav = page.getByRole("navigation", { name: "Walkthrough stages" });
  for (const label of [
    "Your Starting Point",
    "Your Context",
    "Your Biomarkers",
    "Your Formula",
    "Your Next Formula",
  ]) {
    await expect(nav.getByText(label)).toBeVisible();
  }
  expect(external()).toEqual([]);
});
