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

test.describe("Preview", () => {
  test("step 5 nda-content contains governing law state", async ({ page }) => {
    await completeWizard(page, { governingLaw: "Delaware" });
    await expect(page.locator(".nda-content").first()).toBeVisible({ timeout: 10000 });
    const previewText = await page.locator(".nda-content").first().textContent();
    expect(previewText).toContain("Delaware");
  });

  test("step 5 nda-content contains both party company names", async ({ page }) => {
    await completeWizard(page, { company1: "Acme Corp", company2: "Widget Inc" });
    await expect(page.locator(".nda-content").first()).toBeVisible({ timeout: 10000 });
    const allContent = await page.locator(".nda-content").allTextContents();
    const fullText = allContent.join(" ");
    expect(fullText).toContain("Acme Corp");
    expect(fullText).toContain("Widget Inc");
  });
});
