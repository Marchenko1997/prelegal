import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printDocument } from "@/lib/printDocument";

describe("printDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => "blob:test-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends HTML to backend and triggers PDF download", async () => {
    const mockBlob = new Blob(["pdf-content"], { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: clickSpy,
    } as unknown as HTMLElement);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);

    await printDocument("<h1>Test</h1>");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/pdf"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ html: "<h1>Test</h1>", filename: "document.pdf" }),
      })
    );
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("uses custom filename", async () => {
    const mockBlob = new Blob(["pdf"], { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: vi.fn(),
    } as unknown as HTMLElement);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);
    vi.spyOn(document.body, "removeChild").mockImplementation((n) => n);

    await printDocument("<p>test</p>", "my-nda.pdf");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ html: "<p>test</p>", filename: "my-nda.pdf" }),
      })
    );
  });

  it("throws on backend error", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(printDocument("<p>fail</p>")).rejects.toThrow("PDF generation failed");
  });
});
