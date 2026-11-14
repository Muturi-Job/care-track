import { expect, test } from "@playwright/test";

/**
 * Requires the API on :3001 with seeded procedures (`make seed`) and the web
 * app on :3000 (`make dev`). Each run creates one demo episode.
 */
test("a nurse can create an episode and advance it with one tap", async ({ page }) => {
  const alias = `E2E patient ${Date.now()}`;

  await page.goto("/staff/episodes/new");
  await expect(page.getByRole("heading", { name: "New episode" })).toBeVisible();
  await expect(page.getByText("CareTrack prototype - demo data only")).toBeVisible();

  // The clock starts once the form is on screen: this is the nurse's minute.
  const startedAt = Date.now();

  await page.getByLabel("Patient alias or first name").fill(alias);
  await page.getByLabel("Ward or bed").fill("Ward 9, Bed 9");
  await page.getByRole("button", { name: "Create episode" }).click();

  await expect(page.getByRole("heading", { name: "Episode created" })).toBeVisible();
  await expect(page.getByText("Only share with people the patient has agreed to.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Share on WhatsApp/ })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/\?text=/,
  );

  expect(Date.now() - startedAt).toBeLessThan(60_000);

  await page.getByRole("link", { name: "Open staff list" }).click();

  const card = page.getByRole("article").filter({ hasText: alias });
  await expect(card).toBeVisible();

  const advance = card.getByRole("button", { name: /^Advance to: / });
  const stageBefore = await advance.innerText();

  // One tap moves the patient on.
  await advance.click();

  const toast = page.getByRole("status").filter({ hasText: "Undo" });
  await expect(toast).toBeVisible();

  // Undo puts the stage back.
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("status")).toContainText("Undo complete");
  await expect(card.getByRole("button", { name: stageBefore })).toBeVisible();
});
