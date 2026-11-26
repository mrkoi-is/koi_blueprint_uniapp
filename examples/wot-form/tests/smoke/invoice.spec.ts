import { expect, test } from "@playwright/test";

test("validates and saves an invoice draft", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Open invoice form", { exact: true }).click();
  await page.getByText("Save invoice", { exact: true }).click();
  await expect(page.getByText("Customer name is required.")).toBeVisible();
  await page.locator("input").fill("Koi customer");
  await page.getByText("Save invoice", { exact: true }).click();
  await expect(page.getByText("Invoice saved.")).toBeVisible();
});
