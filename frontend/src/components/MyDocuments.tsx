"use client";

import { useEffect, useState } from "react";
import { DocumentRecord, getDocuments } from "@/lib/documentsApi";
import { printDocument } from "@/lib/printDocument";

export function MyDocuments() {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    getDocuments()
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="text-brand-gray text-sm mt-8">Loading your documents...</p>
    );
  }

  if (docs.length === 0) return null;

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-brand-navy mb-4">My Documents</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setPreviewDoc(doc)}
            className="text-left bg-white rounded-lg border border-gray-200 p-5 hover:border-brand-blue hover:shadow-md transition"
          >
            <h3 className="font-semibold text-brand-navy mb-1 text-sm">
              {doc.title}
            </h3>
            <p className="text-xs text-brand-gray">
              {formatDate(doc.created_at)}
            </p>
          </button>
        ))}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-brand-navy">
                {previewDoc.title}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => printDocument(previewDoc.html)}
                  className="bg-brand-purple text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="text-brand-gray hover:text-brand-navy text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div
                className="doc-content"
                dangerouslySetInnerHTML={{ __html: previewDoc.html }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
