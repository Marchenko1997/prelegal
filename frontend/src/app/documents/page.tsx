"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentRecord, getDocuments } from "@/lib/documentsApi";
import { printDocument } from "@/lib/printDocument";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/lib/auth";

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

function resumeHref(doc: DocumentRecord): string {
  if (doc.doc_type === "mutual-nda") return `/nda?resume=${doc.id}`;
  return `/doc/${doc.doc_type}?resume=${doc.id}`;
}

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  function fetchDocs() {
    if (!user) return;
    setLoading(true);
    setError(false);
    getDocuments()
      .then(setDocs)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchDocs();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-brand-gray text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar title="My Documents" backHref="/" />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-bold text-brand-navy mb-2">My Documents</h1>
        <p className="text-brand-gray mb-8">
          View, resume editing, or download your saved documents.
        </p>

        {loading ? (
          <p className="text-brand-gray text-sm">Loading your documents...</p>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 text-sm mb-3">Failed to load your documents.</p>
            <button
              onClick={fetchDocs}
              className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-brand-gray mb-4">You have no saved documents yet.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-brand-purple text-white px-6 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            >
              Create a document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-brand-blue hover:shadow-md transition"
              >
                <h3 className="font-semibold text-brand-navy mb-1 text-sm">
                  {doc.title}
                </h3>
                <p className="text-xs text-brand-gray mb-4">
                  {formatDate(doc.updated_at)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(resumeHref(doc))}
                    className="bg-brand-blue text-white px-3 py-1 rounded text-xs font-semibold hover:opacity-90"
                  >
                    Resume editing
                  </button>
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="border border-gray-300 text-brand-navy px-3 py-1 rounded text-xs font-semibold hover:bg-gray-50"
                  >
                    Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-brand-navy">
                {previewDoc.title}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    router.push(resumeHref(previewDoc));
                    setPreviewDoc(null);
                  }}
                  className="bg-brand-blue text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
                >
                  Resume editing
                </button>
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
    </div>
  );
}
