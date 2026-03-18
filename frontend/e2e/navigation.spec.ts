import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("Back button returns to previous step", async ({ page }) => {
    await page.goto("/nda");
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible();
    await page.getByRole("button", { name: "← Back" }).click();
    await expect(page.getByRole("heading", { name: /Step 1/ })).toBeVisible();
  });

  test("Back button is disabled on step 1", async ({ page }) => {
    await page.goto("/nda");
    await expect(page.getByRole("button", { name: "← Back" })).toBeDisabled();
  });

  test("StepIndicator shows correct active step", async ({ page }) => {
    await page.goto("/nda");
    // Step 1 is current — "Agreement Basics" title should be visible in the step heading
    await expect(page.getByRole("heading", { name: "Step 1: Agreement Basics" })).toBeVisible();
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByRole("heading", { name: "Step 2: Duration & Confidentiality" })).toBeVisible();
  });

  test("completed steps show checkmark icon in StepIndicator", async ({ page }) => {
    await page.goto("/nda");
    await page.getByRole("button", { name: "Next →" }).click();
    // After advancing to step 2, step 1 is complete — its circle should contain an SVG
    const firstStepCircle = page.locator("div.w-8.h-8.rounded-full").first();
    await expect(firstStepCircle.locator("svg")).toBeVisible();
  });
});
