# Manual Test Plan — Prelegal Mutual NDA Creator

**Version:** 1.0
**Date:** 2026-03-18
**Scope:** Full end-to-end wizard flow, edge cases, and download behaviour
**Prerequisites:** Backend running at `http://localhost:8001`, frontend at `http://localhost:3000`

---

## MT-01: Wizard navigation — forward through all 5 steps

**Preconditions:** App loaded at `/nda`. Default form values in place.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Click **Next →** on Step 1 | Step 2 opens. StepIndicator shows step 1 as completed (checkmark). |
| 2 | Click **Next →** on Step 2 | Step 3 opens. StepIndicator shows step 2 as completed. |
| 3 | Fill all required fields on Step 3 (see MT-04). Click **Next →** | Step 4 opens. |
| 4 | Draw signatures on both pads. Click **Next →** | Step 5 opens. |
| 5 | Step 5 is visible | Heading reads "Step 5: Review & Download". "Download PDF" button visible. No "Next →" button. |

---

## MT-02: Wizard navigation — Back button

**Preconditions:** Navigated to Step 2.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Click **← Back** | Returns to Step 1. |
| 2 | Verify Back button on Step 1 | Back button is disabled (greyed out, not clickable). |
| 3 | Navigate to Step 3. Click **← Back** | Returns to Step 2 with previously entered values preserved. |

---

## MT-03: Step 1 validation — required fields

**Preconditions:** App loaded at `/nda`.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Clear the Purpose field. Click **Next →** | Inline error "Purpose is required" appears. Wizard stays on Step 1. |
| 2 | Fill in a purpose. Clear the Effective Date. Click **Next →** | Error for Effective Date appears. |
| 3 | Fill both fields. Click **Next →** | Advances to Step 2 with no errors. |

---

## MT-04: Step 3 validation — party details and governing law

**Preconditions:** On Step 3.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Click **Next →** with all fields empty | Errors shown for each required field (Full Legal Name, Title, Company, Notice Address, Date of Signing for both parties, Governing Law State, Jurisdiction). |
| 2 | Fill all party 1 fields but leave party 2 empty. Click **Next →** | Only party 2 errors shown. |
| 3 | Fill all fields correctly. Click **Next →** | Advances to Step 4. |

---

## MT-05: Step 2 validation — term years required when "expires"

**Preconditions:** On Step 2. "Expires after a fixed number of years" is selected.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Clear the MNDA Term years field. Click **Next →** | Error "Please enter the number of years" appears. Stays on Step 2. |
| 2 | Select "Continues until terminated". Click **Next →** | Years field hidden. Advances without error. |
| 3 | Re-select "Expires". Enter a years value. Click **Next →** | Advances to Step 3. |

---

## MT-06: Step 2 validation — confidentiality term years required when "years"

**Preconditions:** On Step 2. "Fixed number of years from Effective Date" is selected for confidentiality.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Clear the confidentiality years field. Click **Next →** | Error appears. |
| 2 | Select "In perpetuity". Click **Next →** | Advances without error. |

---

## MT-07: Step 4 — Signature pad behaviour

**Preconditions:** On Step 4.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Draw on Party 1 canvas using mouse | "✓ Signature captured" appears below Party 1 pad. |
| 2 | Click **Clear** under Party 1 | Canvas clears. "✓ Signature captured" disappears. |
| 3 | Click **Next →** without any signature | Error "Party 1 signature is required" (and/or Party 2) appears. Stays on Step 4. |
| 4 | Draw on both canvases. Click **Next →** | Advances to Step 5. |

---

## MT-08: Step 5 — Preview content

**Preconditions:** Completed Steps 1–4 with the following test data:
- Purpose: "Evaluating a joint venture opportunity"
- Effective Date: 2026-03-18
- MNDA Term: 3 years
- Confidentiality: 5 years
- Party 1: Jane Doe, CEO, Acme Corp
- Party 2: John Smith, CTO, Widget Inc
- Governing Law: Delaware
- Jurisdiction: courts located in New Castle, DE

| # | Step | Expected result |
|---|------|----------------|
| 1 | Observe preview panel on Step 5 | Preview loads (no "Loading document preview…" spinner after a few seconds). |
| 2 | Check cover page section | Contains "Jane Doe", "Acme Corp", "John Smith", "Widget Inc". |
| 3 | Check cover page | Effective date shown as "March 18, 2026". |
| 4 | Check cover page | MNDA term shows "3 year(s) from Effective Date" with the "Expires" checkbox ticked. |
| 5 | Check cover page | Governing Law shows "Delaware". |
| 6 | Check standard terms section | Contains "5 year(s) from Effective Date" in the Term of Confidentiality field. |

---

## MT-09: Download / print dialog

**Preconditions:** Completed the full wizard (Steps 1–5).

| # | Step | Expected result |
|---|------|----------------|
| 1 | Click **Download PDF** | Loading spinner appears on the button briefly. |
| 2 | If pop-ups are allowed | Browser print dialog opens with the rendered NDA. |
| 3 | If pop-ups are blocked | Alert "Please allow pop-ups to download the PDF." shown. |
| 4 | No error banner | "Download failed" banner is NOT shown after a successful download. |

---

## MT-10: Edge cases — special characters in party names

**Preconditions:** On Step 3.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Enter `<script>alert(1)</script>` as Party 1 Full Legal Name | Field accepts the input without executing script. |
| 2 | Advance to Step 5 | Preview renders the name as literal text: `&lt;script&gt;alert(1)&lt;/script&gt;` (HTML-escaped). No alert fires. |
| 3 | Enter `&` and `"` in a company name | Preview shows `&amp;` and `&quot;` or the literal characters — no broken HTML. |

---

## MT-11: Edge cases — very long purpose text

**Preconditions:** Step 1.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Enter 2000 characters in the Purpose field | Field accepts all text without truncation error. |
| 2 | Advance to Step 5 | Preview renders the full purpose text without layout breakage. |

---

## MT-12: Edge cases — past effective date

**Preconditions:** Step 1.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Enter a past date (e.g., 2020-01-01) in the Effective Date field | Field accepts it without error. |
| 2 | Advance to Step 5 | Preview shows "January 1, 2020" in the effective date position. |

---

## MT-13: StepIndicator state during navigation

**Preconditions:** App loaded at `/nda`.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Observe StepIndicator on Step 1 | Step 1 circle has a ring/highlight. Steps 2–5 are grey. |
| 2 | Advance to Step 2 | Step 1 shows a checkmark. Step 2 has the ring. Connector between steps 1 and 2 is blue. |
| 3 | Click Back to Step 1 | Step 2 ring is removed. Step 1 ring returns. Step 1 checkmark disappears. |

---

## MT-14: Modifications field (optional)

**Preconditions:** Step 3.

| # | Step | Expected result |
|---|------|----------------|
| 1 | Leave MNDA Modifications field empty | Advance through wizard succeeds without error. |
| 2 | On Step 5, check modifications section in preview | Shows "_No modifications._" |
| 3 | Go back to Step 3. Enter "Add clause 5A: NDA void after acquisition." | Advance to Step 5. Preview shows the entered modifications text. |

---

*This manual test plan is linked to Jira issue PL-3.*
