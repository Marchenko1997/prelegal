import { UseFormRegister, FieldError } from "react-hook-form";
import { NdaFormData } from "@/types/nda";

interface DateInputProps {
  label: string;
  name: string;
  register: UseFormRegister<NdaFormData>;
  error?: FieldError;
  required?: boolean;
}

export function DateInput({ label, name, register, error, required = false }: DateInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        type="date"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...register(name as any, { required: required ? `${label} is required` : false })}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {error && <p className="text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
