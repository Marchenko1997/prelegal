import { Page, expect } from "@playwright/test";

export async function completeWizard(
  page: Page,
  {
    party1Name = "Alice Smith",
    party2Name = "Bob Jones",
    company1 = "Acme Corp",
    company2 = "Widget Inc",
    governingLaw = "Delaware",
    jurisdiction = "courts located in Wilmington, DE",
  } = {}
) {
  await page.goto("/nda");

  // Step 1: defaults already filled (purpose + effectiveDate)
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 2: defaults already filled (expires + years)
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 3: fill party details using id-linked labels (id = field name path)
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

  // Step 4: draw signatures using canvas bounding boxes for correct absolute coordinates
  const canvases = page.locator("canvas");

  // Party 1
  const canvas1 = canvases.first();
  const box1 = await canvas1.boundingBox();
  if (!box1) throw new Error("Canvas 1 bounding box not found");
  await page.mouse.move(box1.x + 20, box1.y + 20);
  await page.mouse.down();
  await page.mouse.move(box1.x + 60, box1.y + 40);
  await page.mouse.move(box1.x + 100, box1.y + 20);
  await page.mouse.up();
  await expect(page.getByText("✓ Signature captured").first()).toBeVisible();

  // Party 2
  const canvas2 = canvases.nth(1);
  const box2 = await canvas2.boundingBox();
  if (!box2) throw new Error("Canvas 2 bounding box not found");
  await page.mouse.move(box2.x + 20, box2.y + 20);
  await page.mouse.down();
  await page.mouse.move(box2.x + 60, box2.y + 40);
  await page.mouse.move(box2.x + 100, box2.y + 20);
  await page.mouse.up();
  await expect(page.getByText("✓ Signature captured").nth(1)).toBeVisible();

  await page.getByRole("button", { name: "Next →" }).click();
}
