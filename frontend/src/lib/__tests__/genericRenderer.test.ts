import { describe, it, expect } from "vitest";
import { renderGenericTemplate } from "../genericRenderer";

describe("renderGenericTemplate", () => {
  it("replaces keyterms_link spans with field values", () => {
    const template = '<span class="keyterms_link">Customer</span>';
    const result = renderGenericTemplate(template, { Customer: "Acme Corp" });
    expect(result).toContain("Acme Corp");
    expect(result).not.toContain("keyterms_link");
  });

  it("replaces coverpage_link spans", () => {
    const template = '<span class="coverpage_link">Provider</span>';
    const result = renderGenericTemplate(template, { Provider: "Tech Inc" });
    expect(result).toContain("Tech Inc");
  });

  it("replaces orderform_link spans", () => {
    const template = '<span class="orderform_link">Subscription Period</span>';
    const result = renderGenericTemplate(template, { "Subscription Period": "1 year" });
    expect(result).toContain("1 year");
  });

  it("replaces sow_link spans", () => {
    const template = '<span class="sow_link">Deliverables</span>';
    const result = renderGenericTemplate(template, { Deliverables: "Software" });
    expect(result).toContain("Software");
  });

  it("shows styled placeholder for missing fields", () => {
    const template = '<span class="keyterms_link">Customer</span>';
    const result = renderGenericTemplate(template, {});
    expect(result).toContain("[Customer]");
  });

  it("escapes HTML in field values to prevent XSS", () => {
    const template = '<span class="keyterms_link">Customer</span>';
    const result = renderGenericTemplate(template, { Customer: '<script>alert("xss")</script>' });
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("handles null field values with placeholder", () => {
    const template = '<span class="keyterms_link">Customer</span>';
    const result = renderGenericTemplate(template, { Customer: null });
    expect(result).toContain("[Customer]");
  });

  it("normalizes smart apostrophe (U+2019) in field names", () => {
    // Template uses a Unicode smart apostrophe; LLM returns ASCII apostrophe key
    const template = '<span class="keyterms_link">Customer\u2019s</span>';
    const result = renderGenericTemplate(template, { "Customer's": "Acme Corp's" });
    expect(result).toContain("Acme Corp");
    expect(result).not.toContain("[Customer");
  });

  it("resolves possessive via base form when available", () => {
    const template = '<span class="keyterms_link">Customer\u2019s</span>';
    const result = renderGenericTemplate(template, { Customer: "Acme Corp" });
    expect(result).toContain("Acme Corp");
  });

  it("renders markdown to HTML", () => {
    const template = "# Agreement\n\nThis is an agreement between parties.";
    const result = renderGenericTemplate(template, {});
    expect(result).toContain("<h1>");
    expect(result).toContain("Agreement");
  });
});
