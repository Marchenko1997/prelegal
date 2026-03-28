const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export async function printDocument(html: string, filename?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ html, filename: filename ?? "document.pdf" }),
  });

  if (!res.ok) {
    throw new Error("PDF generation failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? "document.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
