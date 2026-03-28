const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export interface DocChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DocChatResponse {
  reply: string;
  fields: Record<string, string | null>;
  complete: boolean;
}

export async function sendDocChatMessage(
  docType: string,
  messages: DocChatMessage[],
  currentFields: Record<string, string | null>
): Promise<DocChatResponse> {
  const response = await fetch(`${API_BASE}/api/doc-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      doc_type: docType,
      messages,
      current_fields: currentFields,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat error: ${error}`);
  }

  return response.json();
}

export async function fetchDocTemplate(slug: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/doc-templates/${slug}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${slug}`);
  }
  return response.text();
}

export async function generateDoc(
  docType: string,
  fields: Record<string, string | null>,
  title: string
): Promise<{ html: string }> {
  const response = await fetch(`${API_BASE}/api/generate-doc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ doc_type: docType, fields, title }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate document: ${error}`);
  }

  return response.json();
}
