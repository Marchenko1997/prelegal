import { UseFormRegister, FieldError } from "react-hook-form";
import { NdaFormData } from "@/types/nda";

interface TextareaInputProps {
  label: string;
  name: string;
  register: UseFormRegister<NdaFormData>;
  error?: FieldError;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export function TextareaInput({
  label,
  name,
  register,
  error,
  placeholder,
  required = false,
  rows = 3,
}: TextareaInputProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        rows={rows}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...register(name as any, { required: required ? `${label} is required` : false })}
        placeholder={placeholder}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
      />
      {error && <p className="text-xs text-red-500">{error.message}</p>}
    </div>
  );
}
