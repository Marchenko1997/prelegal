"use client";

import { useState } from "react";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { NdaFormData } from "@/types/nda";
import { generateNda } from "@/lib/apiClient";
import { printDocument } from "@/lib/printDocument";
import { saveDocument } from "@/lib/documentsApi";

interface SignatureModalProps {
  formData: NdaFormData;
  onClose: () => void;
}

export function SignatureModal({ formData, onClose }: SignatureModalProps) {
  const [sig1, setSig1] = useState("");
  const [sig2, setSig2] = useState("");
  const [errors, setErrors] = useState<{ sig1?: string; sig2?: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleDownload() {
    const errs: { sig1?: string; sig2?: string } = {};
    if (!sig1) errs.sig1 = "Signature required";
    if (!sig2) errs.sig2 = "Signature required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsGenerating(true);
    setGenerateError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const data: NdaFormData = {
        ...formData,
        party1: { ...formData.party1, signature: sig1, date: today },
        party2: { ...formData.party2, signature: sig2, date: today },
      };
      const { html } = await generateNda(data);
      saveDocument({
        doc_type: "mutual-nda",
        title: "Mutual Non-Disclosure Agreement",
        fields: formData as unknown as Record<string, string | null>,
        html,
      }).catch(() => {});
      printDocument(html);
      onClose();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-brand-navy">Sign & Download</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-brand-gray mb-6">
          Both parties must sign before downloading the final PDF.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <SignaturePad
            label={formData.party1.company || "Party 1"}
            value={sig1}
            onChange={setSig1}
            error={errors.sig1}
          />
          <SignaturePad
            label={formData.party2.company || "Party 2"}
            value={sig2}
            onChange={setSig2}
            error={errors.sig2}
          />
        </div>

        {generateError && (
          <p className="text-sm text-red-600 mb-4">{generateError}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="px-6 py-2 text-sm font-semibold text-white bg-brand-purple rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
