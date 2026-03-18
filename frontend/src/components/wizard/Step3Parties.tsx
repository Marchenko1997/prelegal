import { UseFormRegister, FieldErrors } from "react-hook-form";
import { NdaFormData } from "@/types/nda";
import { TextInput } from "@/components/fields/TextInput";
import { TextareaInput } from "@/components/fields/TextareaInput";
import { DateInput } from "@/components/fields/DateInput";

interface Props {
  register: UseFormRegister<NdaFormData>;
  errors: FieldErrors<NdaFormData>;
}

function PartyBlock({
  party,
  register,
  errors,
}: {
  party: 1 | 2;
  register: UseFormRegister<NdaFormData>;
  errors: FieldErrors<NdaFormData>;
}) {
  const prefix = `party${party}` as "party1" | "party2";
  const partyErrors = errors[prefix];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-gray-800 border-b border-gray-200 pb-2">
        Party {party}
      </h3>
      <TextInput
        label="Full Legal Name"
        name={`${prefix}.printName`}
        register={register}
        error={partyErrors?.printName}
        placeholder="Jane Doe"
        required
      />
      <TextInput
        label="Title"
        name={`${prefix}.title`}
        register={register}
        error={partyErrors?.title}
        placeholder="CEO"
        required
      />
      <TextInput
        label="Company"
        name={`${prefix}.company`}
        register={register}
        error={partyErrors?.company}
        placeholder="Acme Corp."
        required
      />
      <TextareaInput
        label="Notice Address"
        name={`${prefix}.noticeAddress`}
        register={register}
        error={partyErrors?.noticeAddress}
        placeholder="jane@acme.com or 123 Main St, City, State 12345"
        required
        rows={2}
      />
      <DateInput
        label="Date of Signing"
        name={`${prefix}.date`}
        register={register}
        error={partyErrors?.date}
        required
      />
    </div>
  );
}

export function Step3Parties({ register, errors }: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* Party columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PartyBlock party={1} register={register} errors={errors} />
        <PartyBlock party={2} register={register} errors={errors} />
      </div>

      <hr className="border-gray-200" />

      {/* Governing Law section */}
      <div className="flex flex-col gap-4">
        <h3 className="font-semibold text-gray-800">Governing Law & Jurisdiction</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Governing Law (State)"
            name="governingLawState"
            register={register}
            error={errors.governingLawState}
            placeholder="Delaware"
            required
          />
          <TextInput
            label="Jurisdiction"
            name="jurisdiction"
            register={register}
            error={errors.jurisdiction}
            placeholder="courts located in New Castle, DE"
            required
          />
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Modifications */}
      <TextareaInput
        label="MNDA Modifications (optional)"
        name="modifications"
        register={register}
        error={errors.modifications}
        placeholder="List any modifications to the standard terms, or leave blank"
        rows={3}
      />
    </div>
  );
}
