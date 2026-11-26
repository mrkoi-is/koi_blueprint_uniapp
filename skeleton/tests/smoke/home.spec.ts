import { expect, test } from "@playwright/test";

test("the H5 home page can retry a failed welcome request", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/welcome", async (route) => {
    requests += 1;
    const response =
      requests === 1
        ? { status: 503 }
        : { json: { title: "Welcome back", body: "The workspace is ready." } };
    await route.fulfill({
      ...response,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await page.goto("/");
  const retry = page.getByText("Try again", { exact: true });
  await expect(page.getByText("Something needs attention")).toBeVisible();
  await retry.click();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(page.getByText("The workspace is ready.")).toBeVisible();
  expect(requests).toBe(2);
});
