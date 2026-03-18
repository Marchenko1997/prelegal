"use client";

import { NdaFormData } from "@/types/nda";
import { DocumentPreview } from "@/components/preview/DocumentPreview";
import { useTemplateRenderer } from "@/hooks/useTemplateRenderer";

interface Props {
  formData: NdaFormData;
  onEditStep: (step: number) => void;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

export function Step5Review({ formData, onEditStep }: Props) {
  const { coverpageHtml, termsHtml, isLoading, error } = useTemplateRenderer(formData);

  const mndaTerm =
    formData.mndaTermType === "expires"
      ? `${formData.mndaTermYears} year(s)`
      : "Until terminated";

  const confidentiality =
    formData.confidentialityTermType === "years"
      ? `${formData.confidentialityTermYears} year(s)`
      : "In perpetuity";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Summary Sidebar */}
      <aside className="lg:w-64 shrink-0 flex flex-col gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Summary</h3>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Agreement</span>
              <button onClick={() => onEditStep(0)} className="text-xs text-blue-600 hover:underline">Edit</button>
            </div>
            <SummaryRow label="Effective Date" value={formData.effectiveDate} />
            <SummaryRow label="MNDA Term" value={mndaTerm} />
            <SummaryRow label="Confidentiality" value={confidentiality} />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Governing Law</span>
              <button onClick={() => onEditStep(2)} className="text-xs text-blue-600 hover:underline">Edit</button>
            </div>
            <SummaryRow label="State" value={formData.governingLawState} />
            <SummaryRow label="Jurisdiction" value={formData.jurisdiction} />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Party 1</span>
              <button onClick={() => onEditStep(2)} className="text-xs text-blue-600 hover:underline">Edit</button>
            </div>
            <SummaryRow label="Name" value={formData.party1.printName} />
            <SummaryRow label="Company" value={formData.party1.company} />
            {formData.party1.signature && (
              <div className="py-1">
                <img src={formData.party1.signature} alt="Party 1 Sig" className="h-8" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Party 2</span>
              <button onClick={() => onEditStep(2)} className="text-xs text-blue-600 hover:underline">Edit</button>
            </div>
            <SummaryRow label="Name" value={formData.party2.printName} />
            <SummaryRow label="Company" value={formData.party2.company} />
            {formData.party2.signature && (
              <div className="py-1">
                <img src={formData.party2.signature} alt="Party 2 Sig" className="h-8" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Document Preview */}
      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Loading document preview…
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p className="font-semibold">Preview unavailable</p>
            <p className="mt-1 text-xs">{error}</p>
            <p className="mt-2 text-xs text-gray-600">
              Make sure the backend is running at{" "}
              {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
            </p>
          </div>
        ) : (
          <DocumentPreview coverpageHtml={coverpageHtml} termsHtml={termsHtml} />
        )}
      </div>
    </div>
  );
}
