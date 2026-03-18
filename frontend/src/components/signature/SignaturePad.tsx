"use client";

import { useRef } from "react";
import ReactSignatureCanvas from "react-signature-canvas";

interface SignaturePadProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
}

export function SignaturePad({ label, value, onChange, error }: SignaturePadProps) {
  const sigRef = useRef<ReactSignatureCanvas>(null);

  function handleEnd() {
    if (sigRef.current) {
      const dataUrl = sigRef.current.toDataURL("image/png");
      onChange(dataUrl);
    }
  }

  function handleClear() {
    if (sigRef.current) {
      sigRef.current.clear();
      onChange("");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      {/* Fixed-width container — matches the canvas pixel dimensions exactly to
          prevent the CSS width / backing-buffer size mismatch that corrupts
          the captured signature data URL. */}
      <div className="border-2 border-dashed border-gray-300 rounded-md bg-gray-50 overflow-auto">
        <ReactSignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            width: 400,
            height: 150,
            style: { display: "block", touchAction: "none" },
          }}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-red-600 underline"
        >
          Clear
        </button>
        {value && (
          <span className="text-xs text-green-600">✓ Signature captured</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
