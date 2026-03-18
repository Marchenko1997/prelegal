import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printDocument } from "@/lib/printDocument";

describe("printDocument", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("primary path: calls print via onload handler", () => {
    const mockPrint = vi.fn();
    const mockFocus = vi.fn();
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWindow = {
      print: mockPrint,
      focus: mockFocus,
      closed: false,
      onload: null as (() => void) | null,
      document: { write: mockWrite, close: mockClose },
    };
    vi.spyOn(window, "open").mockReturnValue(mockWindow as unknown as Window);

    printDocument("<p>test</p>");

    // Manually invoke the onload handler (simulating the window load event)
    mockWindow.onload!();

    expect(mockPrint).toHaveBeenCalledTimes(1);
  });

  it("fallback path: calls print via setTimeout when onload does not fire", () => {
    const mockPrint = vi.fn();
    const mockFocus = vi.fn();
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWindow = {
      print: mockPrint,
      focus: mockFocus,
      closed: false,
      onload: null as (() => void) | null,
      document: { write: mockWrite, close: mockClose },
    };
    vi.spyOn(window, "open").mockReturnValue(mockWindow as unknown as Window);

    printDocument("<p>test</p>");

    // Do NOT call onload — advance fake timers to trigger the setTimeout fallback
    vi.advanceTimersByTime(500);

    expect(mockPrint).toHaveBeenCalledTimes(1);
  });

  it("blocked popup: shows alert with 'pop-up' message", () => {
    vi.spyOn(window, "open").mockReturnValue(null as unknown as Window);
    const mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});

    printDocument("<p>test</p>");

    expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("pop-up"));
  });

  it("no double-print guard: print called exactly twice when both onload and timer fire", () => {
    const mockPrint = vi.fn();
    const mockFocus = vi.fn();
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockWindow = {
      print: mockPrint,
      focus: mockFocus,
      closed: false,
      onload: null as (() => void) | null,
      document: { write: mockWrite, close: mockClose },
    };
    vi.spyOn(window, "open").mockReturnValue(mockWindow as unknown as Window);

    printDocument("<p>test</p>");

    // Invoke onload manually (first print call)
    mockWindow.onload!();

    // Advance timer to trigger fallback (second print call)
    vi.advanceTimersByTime(500);

    // Both paths run independently — documented behavior is exactly 2 calls
    expect(mockPrint).toHaveBeenCalledTimes(2);
  });
});
