import { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form";
import { NdaFormData } from "@/types/nda";
import { RadioGroup } from "@/components/fields/RadioGroup";

interface Props {
  register: UseFormRegister<NdaFormData>;
  errors: FieldErrors<NdaFormData>;
  watch: UseFormWatch<NdaFormData>;
}

export function Step2Terms({ register, errors, watch }: Props) {
  const mndaTermType = watch("mndaTermType");
  const confidentialityTermType = watch("confidentialityTermType");

  return (
    <div className="flex flex-col gap-8">
      {/* MNDA Term */}
      <div className="flex flex-col gap-3">
        <RadioGroup
          label="MNDA Term"
          name="mndaTermType"
          hint="How long will this agreement remain in effect?"
          register={register}
          error={errors.mndaTermType}
          options={[
            { value: "expires", label: "Expires after a fixed number of years" },
            { value: "perpetual", label: "Continues until terminated by either party" },
          ]}
        />

        {mndaTermType === "expires" && (
          <div className="ml-6 flex items-center gap-2">
            <label className="text-sm text-gray-700">Number of years:</label>
            <input
              type="number"
              min={1}
              max={10}
              {...register("mndaTermYears", {
                required: "Please enter the number of years",
                min: { value: 1, message: "Must be at least 1 year" },
                max: { value: 10, message: "Must be 10 years or less" },
                valueAsNumber: true,
              })}
              className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">year(s)</span>
            {errors.mndaTermYears && (
              <p className="text-xs text-red-500">{errors.mndaTermYears.message}</p>
            )}
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Confidentiality Term */}
      <div className="flex flex-col gap-3">
        <RadioGroup
          label="Term of Confidentiality"
          name="confidentialityTermType"
          hint="How long must parties keep information confidential after the agreement ends?"
          register={register}
          error={errors.confidentialityTermType}
          options={[
            {
              value: "years",
              label:
                "Fixed number of years from Effective Date (with trade secret carve-out)",
            },
            { value: "perpetual", label: "In perpetuity" },
          ]}
        />

        {confidentialityTermType === "years" && (
          <div className="ml-6 flex items-center gap-2">
            <label className="text-sm text-gray-700">Number of years:</label>
            <input
              type="number"
              min={1}
              max={10}
              {...register("confidentialityTermYears", {
                required: "Please enter the number of years",
                min: { value: 1, message: "Must be at least 1 year" },
                max: { value: 10, message: "Must be 10 years or less" },
                valueAsNumber: true,
              })}
              className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">year(s)</span>
            {errors.confidentialityTermYears && (
              <p className="text-xs text-red-500">
                {errors.confidentialityTermYears.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
