import { expect, test } from "@playwright/test";

test("opens the invoice subpackage and changes tabs", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Invoice details", { exact: true }).click();
  await expect(page.getByText("Invoice detail page")).toBeVisible();
  await page.goto("/");
  await page.locator("#example-settings").click();
  await expect(page.getByText("Settings page")).toBeVisible();
});
