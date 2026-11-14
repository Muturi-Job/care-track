import { expect, test } from "@playwright/test";

test("home page shows the banner and reports API status", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("CareTrack prototype - demo data only")).toBeVisible();
  await expect(page.getByText("API: ok")).toBeVisible();
});
