import "@testing-library/jest-dom";
import { vi } from "vitest";

// react-signature-canvas uses Canvas APIs not implemented in jsdom.
// Without these mocks, any test that imports SignaturePad throws
// "Not implemented: HTMLCanvasElement.prototype.getContext".
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn(
  () => "data:image/png;base64,abc123"
);
