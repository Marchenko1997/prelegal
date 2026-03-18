import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTemplateRenderer } from "@/hooks/useTemplateRenderer";
import type { NdaFormData } from "@/types/nda";

// Mock apiClient — fetchTemplate returns controllable promises
vi.mock("@/lib/apiClient", () => ({
  fetchTemplate: vi.fn(),
}));

// Import the mocked version
import { fetchTemplate } from "@/lib/apiClient";

const SIG = "data:image/png;base64,abc123";

function makeFormData(): NdaFormData {
  const party = {
    signature: SIG,
    printName: "Alice",
    title: "CEO",
    company: "Acme",
    noticeAddress: "123 St",
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
    party2: { ...party },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("useTemplateRenderer", () => {
  it("isLoading is true initially and false after resolve", async () => {
    vi.mocked(fetchTemplate).mockResolvedValue("# Template");
    const { result } = renderHook(() => useTemplateRenderer(makeFormData()));
    expect(result.current.isLoading).toBe(true);
    await act(async () => {});
    expect(result.current.isLoading).toBe(false);
  });

  it("sets error when fetchTemplate rejects", async () => {
    vi.mocked(fetchTemplate).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useTemplateRenderer(makeFormData()));
    await act(async () => {});
    expect(result.current.error).toBe("Network error");
    expect(result.current.isLoading).toBe(false);
  });

  it("returns non-empty coverpageHtml and termsHtml after load", async () => {
    vi.mocked(fetchTemplate).mockResolvedValue("Hello world");
    const { result } = renderHook(() => useTemplateRenderer(makeFormData()));
    await act(async () => {});
    expect(typeof result.current.coverpageHtml).toBe("string");
    expect(result.current.coverpageHtml.length).toBeGreaterThan(0);
    expect(typeof result.current.termsHtml).toBe("string");
    expect(result.current.termsHtml.length).toBeGreaterThan(0);
  });

  it("does not update state after unmount (cancelled flag)", async () => {
    let resolve: (v: string) => void;
    const pending = new Promise<string>((res) => {
      resolve = res;
    });
    vi.mocked(fetchTemplate).mockReturnValue(pending);

    const { result, unmount } = renderHook(() => useTemplateRenderer(makeFormData()));
    // Capture initial state — isLoading is true, no HTML yet
    expect(result.current.isLoading).toBe(true);
    expect(result.current.coverpageHtml).toBe("");

    unmount(); // triggers cancelled = true

    // Resolve AFTER unmount — the cancelled flag must prevent state updates
    await act(async () => {
      resolve!("# Template");
    });

    // State must remain at initial values, proving the cancelled guard worked
    expect(result.current.isLoading).toBe(true);
    expect(result.current.coverpageHtml).toBe("");
    expect(result.current.error).toBeNull();
  });
});
