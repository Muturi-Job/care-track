import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("family page is fast on throttled 3G, accessible, and updates after a staff change", async ({
  page,
  context,
}) => {
  const alias = `Family E2E ${Date.now()}`;

  await page.goto("/staff/episodes/new");
  await page.getByLabel("Patient alias or first name").fill(alias);
  await page.getByLabel("Ward or bed").fill("Ward 8, Bed 3");
  await page.getByRole("button", { name: "Create episode" }).click();
  await expect(page.getByRole("heading", { name: "Episode created" })).toBeVisible();

  const familyLink = await page.getByText(/\/f\/[A-Za-z0-9_-]+$/).textContent();
  expect(familyLink).not.toBeNull();
  const familyUrl = new URL(familyLink!.trim());

  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
    connectionType: "cellular3g",
  });

  const startedAt = Date.now();
  await page.goto(familyUrl.href, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 2, name: "Admitted" })).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(3_000);
  await expect(page.getByText("CareTrack prototype - demo data only")).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);

  const staffPage = await context.newPage();
  await staffPage.goto("/staff");
  const episode = staffPage.getByRole("article").filter({ hasText: alias });
  await expect(episode).toBeVisible();
  await episode.getByRole("button", { name: /^Advance to: / }).click();

  const updatedAt = Date.now();
  await expect(page.getByRole("heading", { level: 2, name: "Preparing" })).toBeVisible({
    timeout: 12_000,
  });
  expect(Date.now() - updatedAt).toBeLessThan(12_000);
  await expect(page.getByRole("status")).toContainText("Now: Preparing.");
});
