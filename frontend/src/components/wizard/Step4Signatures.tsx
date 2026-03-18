"use client";

import { UseFormSetValue, UseFormWatch } from "react-hook-form";
import { NdaFormData } from "@/types/nda";
import { SignaturePad } from "@/components/signature/SignaturePad";

interface Props {
  setValue: UseFormSetValue<NdaFormData>;
  watch: UseFormWatch<NdaFormData>;
  signatureErrors: { party1?: string; party2?: string };
}

export function Step4Signatures({ setValue, watch, signatureErrors }: Props) {
  const sig1 = watch("party1.signature");
  const sig2 = watch("party2.signature");

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        Use your mouse or touchscreen to draw your signature in each box below.
        Click <strong>Clear</strong> to redo.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SignaturePad
          label="Party 1 Signature"
          value={sig1}
          onChange={(dataUrl) => setValue("party1.signature", dataUrl)}
          error={signatureErrors.party1}
        />
        <SignaturePad
          label="Party 2 Signature"
          value={sig2}
          onChange={(dataUrl) => setValue("party2.signature", dataUrl)}
          error={signatureErrors.party2}
        />
      </div>
    </div>
  );
}
