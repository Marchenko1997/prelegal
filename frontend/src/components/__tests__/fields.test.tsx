import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextInput } from "@/components/fields/TextInput";
import { DateInput } from "@/components/fields/DateInput";
import { RadioGroup } from "@/components/fields/RadioGroup";
import { TextareaInput } from "@/components/fields/TextareaInput";

const mockRegister = vi.fn().mockReturnValue({
  name: "test-field",
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn(),
});

describe("Field components smoke tests", () => {
  it("TextInput renders label and input", () => {
    render(
      <TextInput
        label="Company Name"
        name="party1.company"
        register={mockRegister as any}
      />
    );
    expect(screen.getByText("Company Name")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("DateInput renders label and date input", () => {
    render(
      <DateInput
        label="Effective Date"
        name="effectiveDate"
        register={mockRegister as any}
      />
    );
    expect(screen.getByText("Effective Date")).toBeInTheDocument();
    expect(document.querySelector("input[type='date']")).toBeInTheDocument();
  });

  it("RadioGroup renders label and options", () => {
    const options = [
      { value: "expires", label: "Expires" },
      { value: "perpetual", label: "Perpetual" },
    ];
    render(
      <RadioGroup
        label="MNDA Term"
        name="mndaTermType"
        options={options}
        register={mockRegister as any}
      />
    );
    expect(screen.getByText("MNDA Term")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("TextareaInput renders label and textarea", () => {
    render(
      <TextareaInput
        label="Modifications"
        name="modifications"
        register={mockRegister as any}
      />
    );
    expect(screen.getByText("Modifications")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
