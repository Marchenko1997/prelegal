import re
from datetime import datetime
from pathlib import Path

import markdown as md_lib

from models.nda import NdaRequest

def _find_templates_dir() -> Path:
    """Locate templates/ — works in Docker (/app/templates) and local dev (../templates)."""
    here = Path(__file__).parent.parent
    for candidate in [here / "templates", here.parent / "templates"]:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"templates directory not found (searched from {here})")

TEMPLATES_DIR = _find_templates_dir()


def _format_date(iso_date: str) -> str:
    try:
        dt = datetime.strptime(iso_date, "%Y-%m-%d")
        return dt.strftime("%B %d, %Y")
    except ValueError:
        return iso_date


def _safe_replace(text: str, search: str, replacement: str) -> str:
    """String replace without regex to avoid escaping issues with user input."""
    return text.replace(search, replacement)


def _build_mnda_term_text(data: NdaRequest) -> str:
    if data.mnda_term_type == "expires":
        years = data.mnda_term_years or 1
        return f"{years} year(s) from Effective Date"
    return "until terminated"


def _build_confidentiality_term_text(data: NdaRequest) -> str:
    if data.confidentiality_term_type == "years":
        years = data.confidentiality_term_years or 1
        return f"{years} year(s) from Effective Date"
    return "in perpetuity"


def _build_signature_table(data: NdaRequest) -> str:
    formatted_date1 = _format_date(data.party1.date)
    formatted_date2 = _format_date(data.party2.date)
    sig1_html = f'<img src="{data.party1.signature}" style="max-height:60px;max-width:200px;" />'
    sig2_html = f'<img src="{data.party2.signature}" style="max-height:60px;max-width:200px;" />'

    rows = [
        ("Signature", sig1_html, sig2_html),
        ("Print Name", data.party1.print_name, data.party2.print_name),
        ("Title", data.party1.title, data.party2.title),
        ("Company", data.party1.company, data.party2.company),
        ("Notice Address", data.party1.notice_address, data.party2.notice_address),
        ("Date", formatted_date1, formatted_date2),
    ]

    html = (
        '<table style="width:100%;border-collapse:collapse;margin-top:1rem;">'
        "<thead>"
        '<tr><th style="border:1px solid #000;padding:8px;text-align:left;width:25%;"></th>'
        '<th style="border:1px solid #000;padding:8px;text-align:center;width:37.5%;">PARTY 1</th>'
        '<th style="border:1px solid #000;padding:8px;text-align:center;width:37.5%;">PARTY 2</th></tr>'
        "</thead><tbody>"
    )
    for label, val1, val2 in rows:
        html += (
            f'<tr><td style="border:1px solid #000;padding:8px;font-weight:bold;">{label}</td>'
            f'<td style="border:1px solid #000;padding:8px;">{val1}</td>'
            f'<td style="border:1px solid #000;padding:8px;">{val2}</td></tr>'
        )
    html += "</tbody></table>"
    return html


def render_cover_page(data: NdaRequest, template_text: str) -> str:
    text = template_text

    # Purpose
    text = _safe_replace(
        text,
        "[Evaluating whether to enter into a business relationship with the other party.]",
        data.purpose,
    )

    # Effective Date
    text = _safe_replace(text, "[Today's date]", _format_date(data.effective_date))

    # MNDA Term checkboxes
    years = data.mnda_term_years or 1
    if data.mnda_term_type == "expires":
        text = _safe_replace(
            text,
            f"- [x]     Expires [1 year(s)] from Effective Date.",
            f"- [x]     Expires {years} year(s) from Effective Date.",
        )
        # ensure "continues" is unchecked
        text = _safe_replace(
            text,
            "- [x]     Continues until terminated",
            "- [ ]     Continues until terminated",
        )
    else:
        text = _safe_replace(
            text,
            "- [x]     Expires [1 year(s)] from Effective Date.",
            "- [ ]     Expires [1 year(s)] from Effective Date.",
        )
        text = _safe_replace(
            text,
            "- [ ]     Continues until terminated",
            "- [x]     Continues until terminated",
        )

    # Confidentiality Term checkboxes
    conf_years = data.confidentiality_term_years or 1
    if data.confidentiality_term_type == "years":
        text = _safe_replace(
            text,
            "[1 year(s)] from Effective Date, but in the case of trade secrets",
            f"{conf_years} year(s) from Effective Date, but in the case of trade secrets",
        )
        text = _safe_replace(
            text,
            "- [x]     In perpetuity.",
            "- [ ]     In perpetuity.",
        )
    else:
        text = _safe_replace(
            text,
            "- [x]     [1 year(s)] from Effective Date",
            "- [ ]     [1 year(s)] from Effective Date",
        )
        text = _safe_replace(
            text,
            "- [ ]     In perpetuity.",
            "- [x]     In perpetuity.",
        )

    # Governing Law & Jurisdiction
    text = _safe_replace(text, "[Fill in state]", data.governing_law_state)
    text = _safe_replace(
        text,
        '[Fill in city or county and state, i.e. "courts located in New Castle, DE"]',
        data.jurisdiction,
    )

    # MNDA Modifications
    mods_section = "List any modifications to the MNDA"
    if data.modifications and data.modifications.strip():
        text = _safe_replace(text, mods_section, data.modifications.strip())
    else:
        text = _safe_replace(text, mods_section, "_No modifications._")

    # Replace the signature table block
    table_start_marker = "|| PARTY 1 | PARTY 2 |"
    if table_start_marker in text:
        # Find where the table starts
        table_start_idx = text.index(table_start_marker)
        # Find the end of the table (blank line or attribution line)
        rest = text[table_start_idx:]
        # The table ends before the CC attribution line
        attr_marker = "Common Paper Mutual"
        if attr_marker in rest:
            attr_idx = rest.index(attr_marker)
            table_block = rest[:attr_idx].strip()
            after_table = rest[attr_idx:]
        else:
            # fallback: take the whole rest
            table_block = rest.strip()
            after_table = ""
        text = text[:table_start_idx] + _build_signature_table(data) + "\n\n" + after_table

    # Convert markdown to HTML
    html = md_lib.markdown(text, extensions=["tables"])
    return html


def render_standard_terms(data: NdaRequest, template_text: str) -> str:
    text = template_text

    # Build field resolution map for coverpage_link spans
    field_map = {
        "Purpose": data.purpose,
        "Effective Date": _format_date(data.effective_date),
        "MNDA Term": _build_mnda_term_text(data),
        "Term of Confidentiality": _build_confidentiality_term_text(data),
        "Governing Law": data.governing_law_state,
        "Jurisdiction": data.jurisdiction,
    }

    def replace_span(match: re.Match) -> str:
        field_name = match.group(1)
        return field_map.get(field_name, field_name)

    text = re.sub(
        r'<span class="coverpage_link">([^<]+)</span>',
        replace_span,
        text,
    )

    html = md_lib.markdown(text, extensions=["tables"])
    return html


def render_nda(data: NdaRequest) -> str:
    coverpage_path = TEMPLATES_DIR / "Mutual-NDA-coverpage.md"
    terms_path = TEMPLATES_DIR / "Mutual-NDA.md"

    coverpage_md = coverpage_path.read_text(encoding="utf-8")
    terms_md = terms_path.read_text(encoding="utf-8")

    coverpage_html = render_cover_page(data, coverpage_md)
    terms_html = render_standard_terms(data, terms_md)

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mutual Non-Disclosure Agreement</title>
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
    img {{ max-height: 60px; max-width: 200px; }}
    label {{ display: none; }}
    .page-break {{ page-break-before: always; margin-top: 2rem; border-top: 2px solid #000; padding-top: 1rem; }}
    @page {{ size: letter; margin: 1in; }}
    @media print {{
      body {{ padding: 0; max-width: 100%; }}
    }}
  </style>
</head>
<body>
  <div class="cover-page">
    {coverpage_html}
  </div>
  <div class="page-break"></div>
  <div class="standard-terms">
    {terms_html}
  </div>
  <footer style="margin-top:2in;padding-top:12px;border-top:1px solid #ccc;font-size:9pt;color:#666;font-style:italic;">
    This document is an AI-generated draft for reference only and does not constitute legal advice.
    It should be reviewed by a qualified attorney before use.
  </footer>
</body>
</html>"""

    return full_html


def get_template_text(template_name: str) -> str:
    """Return raw markdown text for a template by name."""
    name_map = {
        "coverpage": "Mutual-NDA-coverpage.md",
        "terms": "Mutual-NDA.md",
    }
    filename = name_map.get(template_name)
    if not filename:
        raise FileNotFoundError(f"Unknown template: {template_name}")
    return (TEMPLATES_DIR / filename).read_text(encoding="utf-8")
