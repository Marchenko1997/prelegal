import { NdaFormData } from "@/types/nda";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export interface NdaGenerateResponse {
  html: string;
}

// Transforms camelCase NdaFormData to snake_case for the FastAPI backend
function toApiPayload(data: NdaFormData) {
  return {
    purpose: data.purpose,
    effective_date: data.effectiveDate,
    mnda_term_type: data.mndaTermType,
    mnda_term_years: data.mndaTermYears,
    confidentiality_term_type: data.confidentialityTermType,
    confidentiality_term_years: data.confidentialityTermYears,
    governing_law_state: data.governingLawState,
    jurisdiction: data.jurisdiction,
    modifications: data.modifications || null,
    party1: {
      signature: data.party1.signature,
      print_name: data.party1.printName,
      title: data.party1.title,
      company: data.party1.company,
      notice_address: data.party1.noticeAddress,
      date: data.party1.date,
    },
    party2: {
      signature: data.party2.signature,
      print_name: data.party2.printName,
      title: data.party2.title,
      company: data.party2.company,
      notice_address: data.party2.noticeAddress,
      date: data.party2.date,
    },
  };
}

export async function generateNda(data: NdaFormData): Promise<NdaGenerateResponse> {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(toApiPayload(data)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate NDA: ${error}`);
  }

  return response.json();
}

export async function fetchTemplate(name: "coverpage" | "terms"): Promise<string> {
  const response = await fetch(`${API_BASE}/api/templates/${name}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${name}`);
  }
  return response.text();
}
