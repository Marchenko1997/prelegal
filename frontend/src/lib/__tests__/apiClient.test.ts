import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NdaFormData } from "@/types/nda";

const SIG = "data:image/png;base64,abc123";

function makeFormData(overrides: Partial<NdaFormData> = {}): NdaFormData {
  const party = {
    signature: SIG,
    printName: "Alice Smith",
    title: "CEO",
    company: "Acme Corp",
    noticeAddress: "123 Main St",
    date: "2026-03-18",
  };
  return {
    purpose: "Test purpose",
    effectiveDate: "2026-03-18",
    mndaTermType: "expires",
    mndaTermYears: 2,
    confidentialityTermType: "years",
    confidentialityTermYears: 3,
    governingLawState: "Delaware",
    jurisdiction: "Wilmington, DE",
    modifications: "",
    party1: { ...party },
    party2: { ...party, printName: "Bob Jones", company: "Widget Inc" },
    ...overrides,
  };
}

function makeOkFetch() {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ html: "<p>test</p>" }),
    text: vi.fn().mockResolvedValue("template text"),
  };
}

describe("apiClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("generateNda", () => {
    it("calls the correct URL with POST method", async () => {
      mockFetch.mockResolvedValue(makeOkFetch());
      const { generateNda } = await import("@/lib/apiClient");

      await generateNda(makeFormData());

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("http://test-api/api/generate");
      expect(options.method).toBe("POST");
    });

    it("sends correct Content-Type header", async () => {
      mockFetch.mockResolvedValue(makeOkFetch());
      const { generateNda } = await import("@/lib/apiClient");

      await generateNda(makeFormData());

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("sends snake_case keys in the body", async () => {
      mockFetch.mockResolvedValue(makeOkFetch());
      const { generateNda } = await import("@/lib/apiClient");

      await generateNda(makeFormData());

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      // Top-level snake_case fields
      expect(body).toHaveProperty("effective_date");
      expect(body).not.toHaveProperty("effectiveDate");

      // Party-level snake_case fields
      expect(body.party1).toHaveProperty("print_name");
      expect(body.party1).not.toHaveProperty("printName");
      expect(body.party1).toHaveProperty("notice_address");
      expect(body.party1).not.toHaveProperty("noticeAddress");
    });

    it("maps empty string modifications to null in the payload", async () => {
      mockFetch.mockResolvedValue(makeOkFetch());
      const { generateNda } = await import("@/lib/apiClient");

      await generateNda(makeFormData({ modifications: "" }));

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.modifications).toBeNull();
    });

    it("throws when response is not ok (status 422)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: vi.fn().mockResolvedValue("Unprocessable Entity"),
      });
      const { generateNda } = await import("@/lib/apiClient");

      await expect(generateNda(makeFormData())).rejects.toThrow(
        "Failed to generate NDA"
      );
    });
  });

  describe("fetchTemplate", () => {
    it("calls the correct URL for coverpage template", async () => {
      mockFetch.mockResolvedValue(makeOkFetch());
      const { fetchTemplate } = await import("@/lib/apiClient");

      await fetchTemplate("coverpage");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("http://test-api/api/templates/coverpage");
    });

    it("throws when response is not ok (status 404)", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue("Not Found"),
      });
      const { fetchTemplate } = await import("@/lib/apiClient");

      await expect(fetchTemplate("coverpage")).rejects.toThrow(
        "Failed to fetch template: coverpage"
      );
    });
  });
});
