export interface PartyData {
  signature: string; // base64 data URL
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
  date: string;
}

export interface NdaFormData {
  purpose: string;
  effectiveDate: string;
  mndaTermType: "expires" | "perpetual";
  mndaTermYears: number | null;
  confidentialityTermType: "years" | "perpetual";
  confidentialityTermYears: number | null;
  governingLawState: string;
  jurisdiction: string;
  modifications: string;
  party1: PartyData;
  party2: PartyData;
}

export const defaultParty: PartyData = {
  signature: "",
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
  date: "",
};

export const defaultFormData: NdaFormData = {
  purpose:
    "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: new Date().toISOString().split("T")[0],
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityTermType: "years",
  confidentialityTermYears: 1,
  governingLawState: "",
  jurisdiction: "",
  modifications: "",
  party1: { ...defaultParty },
  party2: { ...defaultParty },
};

// Keys per wizard step — used for per-step validation trigger
export const STEP_FIELDS: Array<string[]> = [
  ["purpose", "effectiveDate"],
  ["mndaTermType", "mndaTermYears", "confidentialityTermType", "confidentialityTermYears"],
  [
    "party1.printName", "party1.title", "party1.company",
    "party1.noticeAddress", "party1.date",
    "party2.printName", "party2.title", "party2.company",
    "party2.noticeAddress", "party2.date",
    "governingLawState", "jurisdiction",
  ],
  ["party1.signature", "party2.signature"],
  [],
];

export const STEP_TITLES = [
  "Agreement Basics",
  "Duration & Confidentiality",
  "Party Details",
  "Signatures",
  "Review & Download",
];
