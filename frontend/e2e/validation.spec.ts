import { test, expect } from "@playwright/test";

test.describe("Validation", () => {
  test("empty purpose on step 1 shows error", async ({ page }) => {
    await page.goto("/nda");
    await page.getByLabel("Purpose").fill("");
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText(/required/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Step 1/ })).toBeVisible();
  });

  test("mndaTermType expires with no years shows error on step 2", async ({ page }) => {
    await page.goto("/nda");
    await page.getByRole("button", { name: "Next →" }).click(); // advance to step 2
    // Explicitly select "expires" to ensure the years input is visible
    await page.getByLabel("Expires after a fixed number of years").check();
    await page.getByLabel("Number of years:").first().fill("");
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText(/required|Please enter/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible();
  });

  test("no signature on step 4 shows error", async ({ page }) => {
    await page.goto("/nda");
    await page.getByRole("button", { name: "Next →" }).click(); // step 1 → 2
    await page.getByRole("button", { name: "Next →" }).click(); // step 2 → 3
    // Fill step 3 minimally
    await page.getByLabel("Full Legal Name").first().fill("Alice");
    await page.getByLabel("Title").first().fill("CEO");
    await page.getByLabel("Company").first().fill("Acme");
    await page.getByLabel("Notice Address").first().fill("123 Main St");
    await page.getByLabel("Date of Signing").first().fill("2026-03-18");
    await page.getByLabel("Full Legal Name").nth(1).fill("Bob");
    await page.getByLabel("Title").nth(1).fill("CTO");
    await page.getByLabel("Company").nth(1).fill("Widget");
    await page.getByLabel("Notice Address").nth(1).fill("456 Oak Ave");
    await page.getByLabel("Date of Signing").nth(1).fill("2026-03-18");
    await page.getByLabel("Governing Law (State)").fill("Delaware");
    await page.getByLabel("Jurisdiction").fill("Wilmington, DE");
    await page.getByRole("button", { name: "Next →" }).click(); // step 3 → 4
    // Try to advance without drawing signatures
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText(/signature is required/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Step 4/ })).toBeVisible();
  });
});
