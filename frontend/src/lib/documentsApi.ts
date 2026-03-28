const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export interface DocumentRecord {
  id: number;
  doc_type: string;
  title: string;
  created_at: string;
  updated_at: string;
  html: string;
}

export interface DocumentDetail {
  id: number;
  doc_type: string;
  title: string;
  created_at: string;
  updated_at: string;
  html: string;
  fields: Record<string, string | number | null>;
}

export async function saveDocument(payload: {
  doc_type: string;
  title: string;
  fields: Record<string, string | null>;
  html: string;
}): Promise<{ id: number }> {
  const r = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Failed to save document");
  return r.json();
}

export async function getDocuments(): Promise<DocumentRecord[]> {
  const r = await fetch(`${API_BASE}/api/documents`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to fetch documents");
  return r.json();
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const r = await fetch(`${API_BASE}/api/documents/${id}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error("Failed to fetch document");
  return r.json();
}
