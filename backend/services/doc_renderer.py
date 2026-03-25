import re

import markdown as md_lib

from services.doc_chat import DOC_NAMES, get_template

BRACKET_FIELDS: dict[str, str] = {
    "Purpose": "[Evaluating whether to enter into a business relationship with the other party.]",
    "Effective Date": "[Today's date]",
    "Governing Law State": "[Fill in state]",
    "Jurisdiction": '[Fill in city or county and state, i.e. "courts located in New Castle, DE"]',
    "Modifications": "List any modifications to the MNDA",
}


def _normalize(name: str) -> str:
    """Normalize Unicode smart apostrophes to ASCII."""
    return name.replace("\u2019", "'").replace("\u2018", "'")


def _replace_spans(text: str, fields: dict[str, str | None]) -> str:
    """Replace all link span markers with their collected values.

    Normalizes smart apostrophes in field names. For possessives like
    "Customer's", falls back to the base form "Customer" + "'s".
    """

    def replace(match: re.Match) -> str:
        normalized = _normalize(match.group(1))
        value = fields.get(normalized)
        if value:
            return value
        if normalized.endswith("'s"):
            base_value = fields.get(normalized[:-2])
            if base_value:
                return f"{base_value}'s"
        return f"[{normalized}]"

    return re.sub(
        r'<span class="(?:keyterms_link|coverpage_link|orderform_link|sow_link)">([^<]+)</span>',
        replace,
        text,
    )


def _build_key_terms_section(fields: dict[str, str | None]) -> str:
    """Build an HTML key terms summary from collected fields."""
    filled = {k: v for k, v in fields.items() if v}
    if not filled:
        return ""

    rows = "".join(
        f'<tr><td style="font-weight:bold;padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;">{k}</td>'
        f'<td style="padding:6px 0;">{v}</td></tr>'
        for k, v in filled.items()
    )

    return f"""<div style="border:1px solid #ccc;padding:16px;margin-bottom:24px;background:#fafafa;">
<h2 style="margin-top:0;font-size:14pt;">Key Terms</h2>
<table style="border-collapse:collapse;width:100%;">{rows}</table>
</div>"""


def render_generic_doc(
    doc_type: str,
    fields: dict[str, str | None],
    title: str = "",
) -> str:
    """Render a generic legal document template to a printable HTML string."""
    template_md = get_template(doc_type)
    doc_name = title or DOC_NAMES.get(doc_type, doc_type)

    text = _replace_spans(template_md, fields)

    # Convert header spans into bold markdown so they render visibly
    text = re.sub(r'<span class="header_2"[^>]*>([^<]+)</span>', r'**\1**', text)
    text = re.sub(r'<span class="header_3"[^>]*>([^<]+)</span>', r'**\1**', text)

    # Replace bracket placeholders (Mutual NDA Cover Page)
    for field_name, bracket in BRACKET_FIELDS.items():
        value = fields.get(field_name)
        if value:
            text = text.replace(bracket, value)

    body_html = md_lib.markdown(text, extensions=["tables"])
    key_terms_html = _build_key_terms_section(fields)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{doc_name}</title>
  <style>
    body {{
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #000;
      max-width: 816px;
      margin: 0 auto;
      padding: 1in;
    }}
    h1 {{ font-size: 16pt; text-align: center; }}
    h2 {{ font-size: 13pt; }}
    h3 {{ font-size: 11pt; }}
    table {{ width: 100%; border-collapse: collapse; margin: 1rem 0; }}
    td, th {{ border: 1px solid #000; padding: 8px; }}
    @page {{ size: letter; margin: 1in; }}
    @media print {{
      body {{ padding: 0; max-width: 100%; }}
    }}
  </style>
</head>
<body>
  <h1>{doc_name}</h1>
  {key_terms_html}
  <div class="standard-terms">
    {body_html}
  </div>
</body>
</html>"""
