const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export interface ChatNdaFields {
  purpose: string | null;
  effective_date: string | null;
  mnda_term_type: "expires" | "perpetual" | null;
  mnda_term_years: number | null;
  confidentiality_term_type: "years" | "perpetual" | null;
  confidentiality_term_years: number | null;
  governing_law_state: string | null;
  jurisdiction: string | null;
  modifications: string | null;
  party1_print_name: string | null;
  party1_title: string | null;
  party1_company: string | null;
  party1_notice_address: string | null;
  party2_print_name: string | null;
  party2_title: string | null;
  party2_company: string | null;
  party2_notice_address: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  fields: ChatNdaFields;
}

export const emptyFields: ChatNdaFields = {
  purpose: null,
  effective_date: null,
  mnda_term_type: null,
  mnda_term_years: null,
  confidentiality_term_type: null,
  confidentiality_term_years: null,
  governing_law_state: null,
  jurisdiction: null,
  modifications: null,
  party1_print_name: null,
  party1_title: null,
  party1_company: null,
  party1_notice_address: null,
  party2_print_name: null,
  party2_title: null,
  party2_company: null,
  party2_notice_address: null,
};

export async function sendChatMessage(
  messages: ChatMessage[],
  currentFields: ChatNdaFields
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages, current_fields: currentFields }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat error: ${error}`);
  }

  return response.json();
}
