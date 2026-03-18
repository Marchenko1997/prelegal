"use client";

interface DocumentPreviewProps {
  coverpageHtml: string;
  termsHtml: string;
}

export function DocumentPreview({ coverpageHtml, termsHtml }: DocumentPreviewProps) {
  if (!coverpageHtml && !termsHtml) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Preview will appear here as you fill in the form
      </div>
    );
  }

  return (
    <div
      className="bg-white shadow-sm border border-gray-200 rounded-lg p-8 font-serif text-sm leading-relaxed overflow-auto max-h-[70vh]"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      {/* Cover Page */}
      <div
        dangerouslySetInnerHTML={{ __html: coverpageHtml }}
        className="nda-content"
      />

      {/* Page Break indicator */}
      <div className="my-6 border-t-2 border-dashed border-gray-300 pt-4">
        <p className="text-xs text-gray-400 text-center mb-4">— Standard Terms —</p>
      </div>

      {/* Standard Terms */}
      <div
        dangerouslySetInnerHTML={{ __html: termsHtml }}
        className="nda-content"
      />
    </div>
  );
}
