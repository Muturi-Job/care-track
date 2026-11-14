import { expect, test } from "@playwright/test";

test("visitors can choose staff or enter a family tracking code", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("CareTrack prototype - demo data only")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Know where they are, every step of the way." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open staff dashboard" }).click();
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole("heading", { name: "Staff Procedure Board" })).toBeVisible();

  await page.goBack();
  await page.getByRole("textbox", { name: "Tracking code" }).fill("k7m2qx9pab");
  await page.getByRole("button", { name: "View progress" }).press("Enter");
  await expect(page).toHaveURL(/\/f\/K7M2QX9PAB$/);
});
