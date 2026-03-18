import { UseFormRegister, FieldError } from "react-hook-form";
import { NdaFormData } from "@/types/nda";

interface Option {
  value: string;
  label: string;
}

interface RadioGroupProps {
  label: string;
  name: string;
  options: Option[];
  register: UseFormRegister<NdaFormData>;
  error?: FieldError;
  hint?: string;
}

export function RadioGroup({ label, name, options, register, error, hint }: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              value={opt.value}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...register(name as any, { required: `${label} is required` })}
              className="mt-0.5 accent-blue-600"
            />
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
