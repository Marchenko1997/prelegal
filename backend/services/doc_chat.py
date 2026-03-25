import json
import os
import re
from pathlib import Path

from litellm import completion

from models.chat import ChatMessage
from models.doc_chat import DocChatResponse

MODEL = "openrouter/arcee-ai/trinity-large-preview:free"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}


def _find_templates_dir() -> Path:
    here = Path(__file__).parent.parent
    for candidate in [here / "templates", here.parent / "templates"]:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"templates directory not found (searched from {here})")


TEMPLATES_DIR = _find_templates_dir()

SLUG_TO_FILENAME: dict[str, str] = {
    "csa": "CSA.md",
    "sla": "sla.md",
    "design-partner-agreement": "design-partner-agreement.md",
    "psa": "psa.md",
    "dpa": "DPA.md",
    "partnership-agreement": "Partnership-Agreement.md",
    "software-license-agreement": "Software-License-Agreement.md",
    "pilot-agreement": "Pilot-Agreement.md",
    "baa": "BAA.md",
    "ai-addendum": "AI-Addendum.md",
    "mutual-nda-coverpage": "Mutual-NDA-coverpage.md",
}

DOC_NAMES: dict[str, str] = {
    "csa": "Cloud Service Agreement",
    "sla": "Service Level Agreement",
    "design-partner-agreement": "Design Partner Agreement",
    "psa": "Professional Services Agreement",
    "dpa": "Data Processing Agreement",
    "partnership-agreement": "Partnership Agreement",
    "software-license-agreement": "Software License Agreement",
    "pilot-agreement": "Pilot Agreement",
    "baa": "Business Associate Agreement",
    "ai-addendum": "AI Addendum",
    "mutual-nda-coverpage": "Mutual NDA Cover Page",
}

# Cover page uses bracket placeholders, not span markers — hardcode its fields
COVERPAGE_FIELDS = [
    "Purpose",
    "Effective Date",
    "Governing Law State",
    "Jurisdiction",
    "Modifications",
]

SUPPORTED_DOCS = [
    "Mutual Non-Disclosure Agreement",
    "Mutual NDA Cover Page",
    "Cloud Service Agreement",
    "Service Level Agreement",
    "Design Partner Agreement",
    "Professional Services Agreement",
    "Data Processing Agreement",
    "Partnership Agreement",
    "Software License Agreement",
    "Pilot Agreement",
    "Business Associate Agreement",
    "AI Addendum",
]


def get_template(slug: str) -> str:
    """Return raw markdown for a document slug."""
    filename = SLUG_TO_FILENAME.get(slug)
    if not filename:
        raise ValueError(f"Unknown document type: {slug}")
    return (TEMPLATES_DIR / filename).read_text(encoding="utf-8")


def _normalize(name: str) -> str:
    """Normalize Unicode smart apostrophes to ASCII in field names."""
    return name.replace("\u2019", "'").replace("\u2018", "'")


def extract_fields(template_text: str) -> list[str]:
    """Extract unique field names from span link markers in the template.

    Normalizes smart apostrophes and skips possessive variants (e.g. "Customer's")
    when the base form ("Customer") is already in the list — those are rendered
    automatically during substitution.
    """
    pattern = r'<span class="(?:keyterms_link|coverpage_link|orderform_link|sow_link)">([^<]+)</span>'
    matches = re.findall(pattern, template_text)
    seen: set[str] = set()
    fields: list[str] = []
    for m in matches:
        normalized = _normalize(m)
        base = normalized[:-2] if normalized.endswith("'s") else None
        if base is not None and base in seen:
            continue  # possessive handled via base form
        if normalized not in seen:
            seen.add(normalized)
            fields.append(normalized)
    return fields


def _build_messages(
    doc_name: str,
    fields_list: list[str],
    conversation: list[ChatMessage],
    current_fields: dict[str, str | None],
) -> list[dict]:
    field_state = json.dumps(current_fields, indent=2)
    fields_bullet = "\n".join(f"- {f}" for f in fields_list)
    supported_bullet = "\n".join(f"- {d}" for d in SUPPORTED_DOCS)

    system = f"""\
You are an AI legal assistant helping a user complete a {doc_name}.
Your job is to have a friendly, conversational dialogue, asking questions one topic at a time to collect all required key terms.

## Fields to collect
{fields_bullet}

## Rules
- On the very first message greet the user warmly and ask your first question.
- Collect fields one at a time in a logical order (parties first, then dates, then business terms).
- Keep replies concise and conversational.
- If a user's response is unclear, ambiguous, or incomplete, ask a clarifying follow-on question before moving to the next field.
- Always carry forward ALL previously collected fields in every response.
- Before congratulating the user, verify that every field above is non-null. If any are still null, ask for them.
- Only when ALL fields are non-null: congratulate the user and tell them to click "Download PDF". Set "complete" to true.
- If the user requests a document type not in the supported list, explain politely that it is not available and suggest the closest supported alternative.

## Supported document types
{supported_bullet}

## Response format (JSON only — no extra text)
{{
  "reply": "<your message to the user>",
  "fields": {{
    <all field names from the list above, each mapped to a string value or null>
  }},
  "complete": false
}}

## Current field state
```json
{field_state}
```"""

    messages: list[dict] = [{"role": "system", "content": system}]
    if not conversation:
        messages.append({"role": "user", "content": "Please begin."})
    else:
        for msg in conversation:
            messages.append({"role": msg.role, "content": msg.content})
    return messages


def call_doc_chat(
    doc_type: str,
    conversation: list[ChatMessage],
    current_fields: dict[str, str | None],
) -> DocChatResponse:
    """Send conversation to LLM for a generic document type and return parsed response."""
    template_text = get_template(doc_type)
    fields_list = (
        COVERPAGE_FIELDS
        if doc_type == "mutual-nda-coverpage"
        else extract_fields(template_text)
    )
    doc_name = DOC_NAMES.get(doc_type, doc_type)

    messages = _build_messages(doc_name, fields_list, conversation, current_fields)

    response = completion(
        model=MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        extra_body=EXTRA_BODY,
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )

    raw = response.choices[0].message.content
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM returned non-JSON response: {exc}") from exc

    if "reply" not in data:
        raise ValueError("LLM response missing required 'reply' field")

    return DocChatResponse(
        reply=data["reply"],
        fields={k: v for k, v in data.get("fields", {}).items()},
        complete=bool(data.get("complete", False)),
    )
