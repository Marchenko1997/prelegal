import { marked } from "marked";
import { NdaFormData } from "@/types/nda";

// Use split/join to avoid regex special-char issues with user-supplied values
function safeReplace(text: string, search: string, replacement: string): string {
  return text.split(search).join(replacement);
}

// Escape user-supplied values before they are injected into HTML/Markdown
// to prevent XSS via dangerouslySetInnerHTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "[Date]";
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildMndaTermText(data: NdaFormData): string {
  if (data.mndaTermType === "expires") {
    return `${data.mndaTermYears ?? 1} year(s) from Effective Date`;
  }
  return "until terminated";
}

function buildConfidentialityTermText(data: NdaFormData): string {
  if (data.confidentialityTermType === "years") {
    return `${data.confidentialityTermYears ?? 1} year(s) from Effective Date`;
  }
  return "in perpetuity";
}

function buildSignatureTable(
  data: NdaFormData,
  showSignatureImages: boolean
): string {
  const sig1 = showSignatureImages && data.party1.signature
    ? `<img src="${data.party1.signature}" style="max-height:50px;max-width:180px;" alt="Party 1 Signature" />`
    : data.party1.signature ? "[Signature on file]" : "&nbsp;";
  const sig2 = showSignatureImages && data.party2.signature
    ? `<img src="${data.party2.signature}" style="max-height:50px;max-width:180px;" alt="Party 2 Signature" />`
    : data.party2.signature ? "[Signature on file]" : "&nbsp;";

  const rows: [string, string, string][] = [
    ["Signature", sig1, sig2],
    ["Print Name", escapeHtml(data.party1.printName) || "&nbsp;", escapeHtml(data.party2.printName) || "&nbsp;"],
    ["Title", escapeHtml(data.party1.title) || "&nbsp;", escapeHtml(data.party2.title) || "&nbsp;"],
    ["Company", escapeHtml(data.party1.company) || "&nbsp;", escapeHtml(data.party2.company) || "&nbsp;"],
    ["Notice Address", escapeHtml(data.party1.noticeAddress) || "&nbsp;", escapeHtml(data.party2.noticeAddress) || "&nbsp;"],
    ["Date", data.party1.date ? formatDate(data.party1.date) : "&nbsp;", data.party2.date ? formatDate(data.party2.date) : "&nbsp;"],
  ];

  const tdStyle = 'style="border:1px solid #ccc;padding:8px;vertical-align:top;"';
  const thStyle = 'style="border:1px solid #ccc;padding:8px;background:#f5f5f5;text-align:center;"';

  let html = `<table style="width:100%;border-collapse:collapse;margin-top:1rem;font-size:0.9em;">
<thead><tr>
<th ${tdStyle}></th>
<th ${thStyle}>PARTY 1</th>
<th ${thStyle}>PARTY 2</th>
</tr></thead><tbody>`;

  for (const [label, v1, v2] of rows) {
    html += `<tr>
<td ${tdStyle}><strong>${label}</strong></td>
<td ${tdStyle}>${v1}</td>
<td ${tdStyle}>${v2}</td>
</tr>`;
  }

  html += "</tbody></table>";
  return html;
}

export function renderCoverPage(
  data: NdaFormData,
  coverPageMd: string,
  showSignatureImages = false
): string {
  let text = coverPageMd;

  // Purpose — escape user input before inserting into Markdown to prevent XSS
  text = safeReplace(
    text,
    "[Evaluating whether to enter into a business relationship with the other party.]",
    escapeHtml(data.purpose) || "[Purpose not specified]"
  );

  // Effective Date
  text = safeReplace(text, "[Today's date]", formatDate(data.effectiveDate));

  // MNDA Term checkboxes
  const mndaYears = data.mndaTermYears ?? 1;
  if (data.mndaTermType === "expires") {
    text = safeReplace(
      text,
      "- [x]     Expires [1 year(s)] from Effective Date.",
      `- [x]     Expires ${mndaYears} year(s) from Effective Date.`
    );
    text = safeReplace(
      text,
      "- [ ]     Continues until terminated in accordance with the terms of the MNDA.",
      "- [ ]     Continues until terminated in accordance with the terms of the MNDA."
    );
  } else {
    text = safeReplace(
      text,
      "- [x]     Expires [1 year(s)] from Effective Date.",
      "- [ ]     Expires [1 year(s)] from Effective Date."
    );
    text = safeReplace(
      text,
      "- [ ]     Continues until terminated in accordance with the terms of the MNDA.",
      "- [x]     Continues until terminated in accordance with the terms of the MNDA."
    );
  }

  // Confidentiality Term checkboxes
  const confYears = data.confidentialityTermYears ?? 1;
  if (data.confidentialityTermType === "years") {
    text = safeReplace(
      text,
      "[1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.",
      `${confYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    );
    text = safeReplace(
      text,
      "- [ ]     In perpetuity.",
      "- [ ]     In perpetuity."
    );
  } else {
    text = safeReplace(
      text,
      "- [x]     [1 year(s)] from Effective Date",
      "- [ ]     [1 year(s)] from Effective Date"
    );
    text = safeReplace(
      text,
      "- [ ]     In perpetuity.",
      "- [x]     In perpetuity."
    );
  }

  // Governing Law & Jurisdiction
  text = safeReplace(text, "[Fill in state]", escapeHtml(data.governingLawState) || "[State]");
  text = safeReplace(
    text,
    '[Fill in city or county and state, i.e. "courts located in New Castle, DE"]',
    escapeHtml(data.jurisdiction) || "[Jurisdiction]"
  );

  // MNDA Modifications
  const modsPlaceholder = "List any modifications to the MNDA";
  if (data.modifications?.trim()) {
    text = safeReplace(text, modsPlaceholder, escapeHtml(data.modifications.trim()));
  } else {
    text = safeReplace(text, modsPlaceholder, "_No modifications._");
  }

  // Replace signature table
  const tableMarker = "|| PARTY 1 | PARTY 2 |";
  if (text.includes(tableMarker)) {
    const tableStart = text.indexOf(tableMarker);
    const rest = text.slice(tableStart);
    const attrMarker = "Common Paper Mutual";
    if (rest.includes(attrMarker)) {
      const attrIdx = rest.indexOf(attrMarker);
      const afterTable = rest.slice(attrIdx);
      text = text.slice(0, tableStart) + buildSignatureTable(data, showSignatureImages) + "\n\n" + afterTable;
    } else {
      text = text.slice(0, tableStart) + buildSignatureTable(data, showSignatureImages);
    }
  }

  // Strip <label> tags (they are hint text, not content)
  text = text.replace(/<label>[^<]*<\/label>/g, "");

  return marked.parse(text) as string;
}

export function renderStandardTerms(
  data: NdaFormData,
  termsMd: string
): string {
  const fieldMap: Record<string, string> = {
    "Purpose": escapeHtml(data.purpose) || "[Purpose]",
    "Effective Date": formatDate(data.effectiveDate),
    "MNDA Term": buildMndaTermText(data),
    "Term of Confidentiality": buildConfidentialityTermText(data),
    "Governing Law": escapeHtml(data.governingLawState) || "[State]",
    "Jurisdiction": escapeHtml(data.jurisdiction) || "[Jurisdiction]",
  };

  let text = termsMd;

  // Replace all coverpage_link spans
  text = text.replace(
    /<span class="coverpage_link">([^<]+)<\/span>/g,
    (_, fieldName) => fieldMap[fieldName] ?? fieldName
  );

  return marked.parse(text) as string;
}
