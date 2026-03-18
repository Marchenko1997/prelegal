import { describe, it, expect } from "vitest";
import { renderCoverPage, renderStandardTerms } from "@/lib/templateRenderer";
import type { NdaFormData } from "@/types/nda";

const SIG = "data:image/png;base64,abc123";

function makeData(overrides: Partial<NdaFormData> = {}): NdaFormData {
  return {
    purpose: "Partnership eval",
    effectiveDate: "2026-03-18",
    mndaTermType: "expires",
    mndaTermYears: 2,
    confidentialityTermType: "years",
    confidentialityTermYears: 3,
    governingLawState: "Delaware",
    jurisdiction: "Wilmington, DE",
    modifications: "",
    party1: { signature: SIG, printName: "Alice Smith", title: "CEO", company: "Acme Corp", noticeAddress: "123 Main St", date: "2026-03-18" },
    party2: { signature: SIG, printName: "Bob Jones", title: "CTO", company: "Widget Inc", noticeAddress: "456 Oak Ave", date: "2026-03-18" },
    ...overrides,
  };
}

// Minimal cover template — uses exact placeholder strings from renderer.ts
const COVER = `\
Purpose: [Evaluating whether to enter into a business relationship with the other party.]
Date: [Today's date]
- [x]     Expires [1 year(s)] from Effective Date.
- [ ]     Continues until terminated in accordance with the terms of the MNDA.
- [x]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- [ ]     In perpetuity.
Law: [Fill in state]
Court: [Fill in city or county and state, i.e. "courts located in New Castle, DE"]
Mods: List any modifications to the MNDA
`;

const TERMS = `\
For: <span class="coverpage_link">Purpose</span>.
Date: <span class="coverpage_link">Effective Date</span>.
MNDA: <span class="coverpage_link">MNDA Term</span>.
Conf: <span class="coverpage_link">Term of Confidentiality</span>.
Law: <span class="coverpage_link">Governing Law</span>.
Court: <span class="coverpage_link">Jurisdiction</span>.
`;

describe("renderCoverPage", () => {
  it("returns a string (not a Promise)", () => {
    const result = renderCoverPage(makeData(), COVER);
    expect(typeof result).toBe("string");
  });

  it("replaces purpose placeholder", () => {
    const html = renderCoverPage(makeData({ purpose: "Test partnership" }), COVER);
    expect(html).toContain("Test partnership");
  });

  it("formats effective date as long form", () => {
    const html = renderCoverPage(makeData({ effectiveDate: "2026-03-18" }), COVER);
    expect(html).toContain("March 18, 2026");
  });

  it("shows expires year count when mndaTermType is expires", () => {
    const html = renderCoverPage(makeData({ mndaTermType: "expires", mndaTermYears: 3 }), COVER);
    expect(html).toContain("Expires 3 year(s)");
  });

  it("shows perpetual text when mndaTermType is perpetual", () => {
    const html = renderCoverPage(makeData({ mndaTermType: "perpetual", mndaTermYears: null }), COVER);
    expect(html).toContain("Continues until terminated");
  });

  it("shows confidentiality year count", () => {
    const html = renderCoverPage(makeData({ confidentialityTermType: "years", confidentialityTermYears: 5 }), COVER);
    expect(html).toContain("5 year(s) from Effective Date");
  });

  it("replaces governing law state", () => {
    const html = renderCoverPage(makeData({ governingLawState: "California" }), COVER);
    expect(html).toContain("California");
  });

  it("replaces jurisdiction", () => {
    const html = renderCoverPage(makeData({ jurisdiction: "San Francisco, CA" }), COVER);
    expect(html).toContain("San Francisco, CA");
  });

  it("shows No modifications when modifications is empty", () => {
    const html = renderCoverPage(makeData({ modifications: "" }), COVER);
    expect(html).toContain("No modifications");
  });

  it("shows modification text when provided", () => {
    const html = renderCoverPage(makeData({ modifications: "Add clause 5A" }), COVER);
    expect(html).toContain("Add clause 5A");
  });

  it("strips <label> tags", () => {
    const withLabel = COVER + "\n<label>Hint text</label>\n";
    const html = renderCoverPage(makeData(), withLabel);
    expect(html).not.toContain("<label>");
  });

  it("escapes XSS in purpose", () => {
    const html = renderCoverPage(makeData({ purpose: "<script>alert(1)</script>" }), COVER);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in party name", () => {
    const data = makeData();
    data.party1.printName = "<img onerror=alert(1)>";
    const html = renderCoverPage(data, COVER);
    expect(html).not.toContain("<img onerror");
  });

  it("escapes XSS in modifications field", () => {
    const html = renderCoverPage(makeData({ modifications: "<script>hack()</script>" }), COVER);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderStandardTerms", () => {
  it("returns a string (not a Promise)", () => {
    expect(typeof renderStandardTerms(makeData(), TERMS)).toBe("string");
  });

  it("replaces all six coverpage_link spans", () => {
    const html = renderStandardTerms(makeData(), TERMS);
    expect(html).toContain("Partnership eval");   // Purpose
    expect(html).toContain("March 18, 2026");     // Effective Date
    expect(html).toContain("2 year(s) from Effective Date");  // MNDA Term
    expect(html).toContain("3 year(s) from Effective Date");  // Term of Confidentiality
    expect(html).toContain("Delaware");            // Governing Law
    expect(html).toContain("Wilmington, DE");      // Jurisdiction
  });

  it("leaves no leftover coverpage_link spans", () => {
    const html = renderStandardTerms(makeData(), TERMS);
    expect(html).not.toContain('class="coverpage_link"');
  });
});
