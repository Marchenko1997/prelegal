import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StepIndicator } from "@/components/wizard/StepIndicator";

describe("StepIndicator", () => {
  it("completed step shows checkmark SVG", () => {
    const { container } = render(<StepIndicator currentStep={1} />);
    // Step 0 is completed when currentStep=1 — its circle should contain an SVG
    const circles = container.querySelectorAll(
      "div.w-8.h-8.rounded-full"
    );
    const firstCircle = circles[0];
    expect(firstCircle.querySelector("svg")).not.toBeNull();
  });

  it("completed step does NOT show a number", () => {
    const { container } = render(<StepIndicator currentStep={1} />);
    // Step 0 is completed — circle should NOT render "1" as text content
    const circles = container.querySelectorAll("div.w-8.h-8.rounded-full");
    const firstCircle = circles[0];
    // The text content of the circle should not be "1" (it should be empty / SVG)
    expect(firstCircle.textContent?.trim()).not.toBe("1");
  });

  it("current step has ring class", () => {
    const { container } = render(<StepIndicator currentStep={1} />);
    // Step 1 is current — its circle should have ring-2 class
    const circles = container.querySelectorAll("div.w-8.h-8.rounded-full");
    const currentCircle = circles[1];
    expect(currentCircle.classList.contains("ring-2")).toBe(true);
  });

  it("left connector of current step is blue", () => {
    const { container } = render(<StepIndicator currentStep={1} />);
    // Each step with index > 0 has a left connector div: "flex-1 h-0.5 transition-colors"
    // With currentStep=1, step index=1 has leftConnectorFilled=true → bg-blue-600
    const connectors = container.querySelectorAll("div.flex-1.h-0\\.5");
    // connectors are ordered: step1-left, step1-right, step2-left, step2-right, ...
    // step 1 left connector is at index 0 (first connector in the DOM)
    expect(connectors[0].classList.contains("bg-blue-600")).toBe(true);
  });

  it("future step connector is gray", () => {
    const { container } = render(<StepIndicator currentStep={1} />);
    // With currentStep=1, step index=2 has leftConnectorFilled=false → bg-gray-200
    // connectors: [step1-left, step1-right, step2-left, step2-right, ...]
    // step 2 left connector: index 2 in the connector NodeList
    const connectors = container.querySelectorAll("div.flex-1.h-0\\.5");
    expect(connectors[2].classList.contains("bg-gray-200")).toBe(true);
  });
});
