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
export function renderGenericTemplate(
  templateMd: string,
  fields: Record<string, string | null>
): string {
  const text = templateMd.replace(
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

  return marked.parse(text) as string;
}
