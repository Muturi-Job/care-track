import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test.beforeAll(({}, testInfo) => {
  testInfo.setTimeout(120_000);
  execSync("bundle exec rake demo:analytics", {
    cwd: resolve(process.cwd(), "../api"),
    stdio: "pipe",
    timeout: 120_000,
  });
});

test("analytics dashboard surfaces demo patterns in every report", async ({ page }) => {
  await page.goto("/staff/insights");
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
  await expect(page.getByText("Demo data", { exact: true })).toBeVisible();
  await expect(page.getByText(/In recovery has the highest minutes lost/)).toBeVisible();

  await page.getByRole("tab", { name: "Bottlenecks" }).click();
  await expect(page.getByRole("heading", { name: "Average overrun by weekday and hour" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mon 14:00:/ })).toBeVisible();

  await page.getByRole("tab", { name: "Delays" }).click();
  await expect(page.getByRole("heading", { name: "Recorded delay reasons" })).toBeVisible();

  await page.getByRole("tab", { name: "Family inquiries" }).click();
  await expect(page.getByRole("heading", { name: "Inquiries by channel" })).toBeVisible();
  await expect(page.getByText(/Baseline 3/)).toBeVisible();
});

test("logging three inquiries updates the staff episode count", async ({ page }) => {
  await page.goto("/staff");
  const firstCount = page.getByText(/Family inquiries logged: \d+/).first();
  await expect(firstCount).toBeVisible();
  const original = Number((await firstCount.innerText()).match(/\d+/)?.[0] ?? 0);

  for (let index = 1; index <= 3; index += 1) {
    await page.getByRole("button", { name: "Log inquiry" }).click();
    await page.getByRole("button", { name: "Phone" }).click();
    await expect(page.getByText("Inquiry logged")).toBeVisible();
    await expect(page.getByText(new RegExp(`Family inquiries logged: ${original + index}`)).first()).toBeVisible();
  }
});
