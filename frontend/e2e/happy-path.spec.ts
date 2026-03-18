import { test, expect, Page } from "@playwright/test";

async function completeWizard(page: Page, {
  party1Name = "Alice Smith",
  party2Name = "Bob Jones",
  company1 = "Acme Corp",
  company2 = "Widget Inc",
  governingLaw = "Delaware",
  jurisdiction = "courts located in Wilmington, DE",
} = {}) {
  await page.goto("/nda");

  // Step 1: defaults already filled (purpose + effectiveDate)
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 2: defaults already filled (expires + years)
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 3: fill party details
  // Party 1
  await page.getByLabel("Full Legal Name").first().fill(party1Name);
  await page.getByLabel("Title").first().fill("CEO");
  await page.getByLabel("Company").first().fill(company1);
  await page.getByLabel("Notice Address").first().fill("123 Main St, Wilmington, DE");
  await page.getByLabel("Date of Signing").first().fill("2026-03-18");
  // Party 2
  await page.getByLabel("Full Legal Name").nth(1).fill(party2Name);
  await page.getByLabel("Title").nth(1).fill("CTO");
  await page.getByLabel("Company").nth(1).fill(company2);
  await page.getByLabel("Notice Address").nth(1).fill("456 Oak Ave, Dover, DE");
  await page.getByLabel("Date of Signing").nth(1).fill("2026-03-18");
  // Governing law
  await page.getByLabel("Governing Law (State)").fill(governingLaw);
  await page.getByLabel("Jurisdiction").fill(jurisdiction);
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 4: draw signatures
  const canvases = page.locator("canvas");
  // Party 1
  const canvas1 = canvases.first();
  await canvas1.hover();
  await page.mouse.down();
  await page.mouse.move(10, 10);
  await page.mouse.move(50, 30);
  await page.mouse.up();
  await expect(page.getByText("✓ Signature captured").first()).toBeVisible();
  // Party 2
  const canvas2 = canvases.nth(1);
  await canvas2.hover();
  await page.mouse.down();
  await page.mouse.move(10, 10);
  await page.mouse.move(50, 30);
  await page.mouse.up();
  await expect(page.getByText("✓ Signature captured").nth(1)).toBeVisible();

  await page.getByRole("button", { name: "Next →" }).click();
}

test.describe("Happy path", () => {
  test("completes wizard and reaches step 5", async ({ page }) => {
    await completeWizard(page);
    // Should now be on step 5
    await expect(page.getByRole("heading", { name: /Step 5/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  });

  test("step 5 preview contains party names", async ({ page }) => {
    await completeWizard(page, { party1Name: "Alice Smith", party2Name: "Bob Jones" });
    // Wait for preview to load (backend must be running)
    await expect(page.locator(".nda-content").first()).toBeVisible({ timeout: 10000 });
    const previewText = await page.locator(".nda-content").first().textContent();
    expect(previewText).toContain("Alice Smith");
  });

  test("download button triggers without error toast", async ({ page }) => {
    await completeWizard(page);
    // Mock window.open to prevent actual print dialog
    await page.addInitScript(() => {
      window.open = () => null;
    });
    await page.getByRole("button", { name: "Download PDF" }).click();
    // Should not show error banner "Download failed"
    await expect(page.getByText("Download failed")).not.toBeVisible({ timeout: 5000 });
  });
});
