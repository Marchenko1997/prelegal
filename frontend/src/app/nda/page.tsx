"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  NdaFormData,
  defaultFormData,
  STEP_FIELDS,
  STEP_TITLES,
} from "@/types/nda";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { Step1Agreement } from "@/components/wizard/Step1Agreement";
import { Step2Terms } from "@/components/wizard/Step2Terms";
import { Step3Parties } from "@/components/wizard/Step3Parties";
import { Step4Signatures } from "@/components/wizard/Step4Signatures";
import { Step5Review } from "@/components/wizard/Step5Review";
import { generateNda } from "@/lib/apiClient";
import { printDocument } from "@/lib/printDocument";

export default function NdaPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signatureErrors, setSignatureErrors] = useState<{
    party1?: string;
    party2?: string;
  }>({});

  const {
    register,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<NdaFormData>({ defaultValues: defaultFormData });

  const formData = watch();

  async function handleNext() {
    const fieldsToValidate = STEP_FIELDS[currentStep] as (keyof NdaFormData)[];

    // Step 4: manual signature validation (not managed by react-hook-form register)
    if (currentStep === 3) {
      const sigErrors: { party1?: string; party2?: string } = {};
      if (!formData.party1.signature) sigErrors.party1 = "Party 1 signature is required";
      if (!formData.party2.signature) sigErrors.party2 = "Party 2 signature is required";
      setSignatureErrors(sigErrors);
      if (Object.keys(sigErrors).length > 0) return;
    }

    // Validate the current step's fields
    if (fieldsToValidate.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valid = await trigger(fieldsToValidate as any);
      if (!valid) return;
    }

    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    setCurrentStep((s) => Math.max(0, s - 1));
  }

  async function handleDownload() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const data = getValues();
      const { html } = await generateNda(data);
      printDocument(html);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isFinalStep = currentStep === STEP_TITLES.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Mutual NDA Creator</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Common Paper Mutual Non-Disclosure Agreement · Version 1.0
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <StepIndicator currentStep={currentStep} />

        {/* Step heading */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Step {currentStep + 1}: {STEP_TITLES[currentStep]}
          </h2>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          {currentStep === 0 && (
            <Step1Agreement register={register} errors={errors} />
          )}
          {currentStep === 1 && (
            <Step2Terms register={register} errors={errors} watch={watch} />
          )}
          {currentStep === 2 && (
            <Step3Parties register={register} errors={errors} />
          )}
          {currentStep === 3 && (
            <Step4Signatures
              setValue={setValue}
              watch={watch}
              signatureErrors={signatureErrors}
            />
          )}
          {currentStep === 4 && (
            <Step5Review
              formData={formData}
              onEditStep={(step) => setCurrentStep(step)}
            />
          )}
        </div>

        {/* Error banner */}
        {submitError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p className="font-semibold">Download failed</p>
            <p className="mt-1">{submitError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {isFinalStep ? (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                "Download PDF"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Next →
            </button>
          )}
        </div>
      </main>

      {/* Footer attribution */}
      <footer className="text-center text-xs text-gray-400 py-6">
        Common Paper Mutual Non-Disclosure Agreement (Version 1.0) · Free to use under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          CC BY 4.0
        </a>
      </footer>
    </div>
  );
}
