import { test, expect } from "@playwright/test";
import { completeWizard } from "./helpers";

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
