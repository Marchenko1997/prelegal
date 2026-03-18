import { test, expect } from "@playwright/test";
import { completeWizard } from "./helpers";

test.describe("Happy path", () => {
  test("completes wizard and reaches step 5", async ({ page }) => {
    await completeWizard(page);
    await expect(page.getByRole("heading", { name: /Step 5/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();
  });

  test("step 5 preview contains both party names", async ({ page }) => {
    await completeWizard(page, { party1Name: "Alice Smith", party2Name: "Bob Jones" });
    await expect(page.locator(".nda-content").first()).toBeVisible({ timeout: 10000 });
    const allContent = await page.locator(".nda-content").allTextContents();
    const fullText = allContent.join(" ");
    expect(fullText).toContain("Alice Smith");
    expect(fullText).toContain("Bob Jones");
  });

  test("download button triggers without error toast", async ({ page }) => {
    // Register init script BEFORE navigation so it applies to the page
    await page.addInitScript(() => {
      // Provide a minimal fake print window to prevent an actual print dialog
      // while still satisfying printDocument's onload / setTimeout logic.
      (window as unknown as Record<string, unknown>).open = () => ({
        onload: null,
        closed: false,
        focus: () => {},
        print: () => {},
        document: { write: () => {}, close: () => {} },
      });
    });
    await completeWizard(page);
    await page.getByRole("button", { name: "Download PDF" }).click();
    // Should not show error banner "Download failed"
    await expect(page.getByText("Download failed")).not.toBeVisible({ timeout: 8000 });
  });
});
