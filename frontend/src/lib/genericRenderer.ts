import { marked } from "marked";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function normalize(name: string): string {
  return name.replace(/\u2019/g, "'").replace(/\u2018/g, "'");
}

/**
 * Render a generic legal document template with collected field values.
 * Replaces all keyterms_link, coverpage_link, orderform_link, sow_link spans.
 * Normalizes smart apostrophes and resolves possessives via the base form.
 */
/**
 * Bracket-placeholder-to-field mapping used by the Mutual NDA Cover Page.
 * These templates use literal bracket text instead of span markers.
 */
const BRACKET_FIELDS: Record<string, string> = {
  Purpose:
    "[Evaluating whether to enter into a business relationship with the other party.]",
  "Effective Date": "[Today's date]",
  "Governing Law State": "[Fill in state]",
  Jurisdiction:
    '[Fill in city or county and state, i.e. "courts located in New Castle, DE"]',
  Modifications: "List any modifications to the MNDA",
};

export function renderGenericTemplate(
  templateMd: string,
  fields: Record<string, string | null>
): string {
  let text = templateMd;

  // Convert header spans into bold markdown so marked renders them visibly.
  // These spans carry no field data — they are purely presentational.
  text = text.replace(
    /<span class="header_2"[^>]*>([^<]+)<\/span>/g,
    "**$1**"
  );
  text = text.replace(
    /<span class="header_3"[^>]*>([^<]+)<\/span>/g,
    "**$1**"
  );

  // Replace field-value spans (keyterms, coverpage, orderform, sow)
  text = text.replace(
    /<span class="(?:keyterms_link|coverpage_link|orderform_link|sow_link)">([^<]+)<\/span>/g,
    (_, rawName: string) => {
      const fieldName = normalize(rawName);
      const value = fields[fieldName];
      if (value) return `<strong>${escapeHtml(value)}</strong>`;

      // For possessives like "Customer's", fall back to base form + "'s"
      if (fieldName.endsWith("'s")) {
        const baseValue = fields[fieldName.slice(0, -2)];
        if (baseValue) return `<strong>${escapeHtml(baseValue)}'s</strong>`;
      }

      return `<span style="color:#aaa;font-style:italic;">[${escapeHtml(fieldName)}]</span>`;
    }
  );

  // Replace bracket placeholders (Mutual NDA Cover Page)
  for (const [fieldName, bracket] of Object.entries(BRACKET_FIELDS)) {
    const value = fields[fieldName];
    if (value) {
      text = text.split(bracket).join(escapeHtml(value));
    }
  }

  return marked.parse(text) as string;
}
