import { UseFormRegister, FieldErrors } from "react-hook-form";
import { NdaFormData } from "@/types/nda";
import { TextareaInput } from "@/components/fields/TextareaInput";
import { DateInput } from "@/components/fields/DateInput";

interface Props {
  register: UseFormRegister<NdaFormData>;
  errors: FieldErrors<NdaFormData>;
}

export function Step1Agreement({ register, errors }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">What is a Mutual NDA?</p>
        <p>
          A Mutual Non-Disclosure Agreement (MNDA) allows two parties to share
          confidential information while protecting it from disclosure to third
          parties. Both parties agree to keep each other&apos;s information secret.
        </p>
      </div>

      <TextareaInput
        label="Purpose"
        name="purpose"
        register={register}
        error={errors.purpose}
        placeholder="How will the Confidential Information be used?"
        required
        rows={3}
      />
      <p className="text-xs text-gray-500 -mt-4">
        Describe how the parties plan to use confidential information shared under this agreement.
      </p>

      <DateInput
        label="Effective Date"
        name="effectiveDate"
        register={register}
        error={errors.effectiveDate}
        required
      />
    </div>
  );
}
