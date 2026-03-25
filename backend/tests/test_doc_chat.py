from unittest.mock import MagicMock, patch

import pytest

from services.doc_chat import DOC_NAMES, SLUG_TO_FILENAME, extract_fields, get_template


# --- Unit tests for doc_chat service ---


def test_slug_to_filename_covers_all_slugs():
    assert "csa" in SLUG_TO_FILENAME
    assert "sla" in SLUG_TO_FILENAME
    assert "psa" in SLUG_TO_FILENAME
    # mutual-nda-coverpage uses literal placeholders, not spans — served via /nda instead
    assert "mutual-nda-coverpage" not in SLUG_TO_FILENAME


def test_doc_names_cover_all_slugs():
    assert set(DOC_NAMES.keys()) == set(SLUG_TO_FILENAME.keys())


def test_get_template_csa_loads():
    text = get_template("csa")
    assert len(text) > 100
    assert "Cloud Service Agreement" in text or "Service" in text


def test_get_template_unknown_slug_raises():
    with pytest.raises(ValueError, match="Unknown document type"):
        get_template("nonexistent-doc")


def test_extract_fields_from_csa():
    template = get_template("csa")
    fields = extract_fields(template)
    assert "Customer" in fields
    assert "Provider" in fields
    # No duplicates
    assert len(fields) == len(set(fields))


def test_extract_fields_empty_template():
    assert extract_fields("No spans here.") == []


def test_extract_fields_various_span_types():
    template = (
        '<span class="keyterms_link">Customer</span> and '
        '<span class="coverpage_link">Provider</span> agree. '
        '<span class="orderform_link">Subscription Period</span> is 1 year. '
        '<span class="sow_link">Deliverables</span> are listed. '
        '<span class="header_2">Section Title</span> is ignored.'
    )
    fields = extract_fields(template)
    assert fields == ["Customer", "Provider", "Subscription Period", "Deliverables"]


def test_extract_fields_deduplicates():
    template = (
        '<span class="keyterms_link">Customer</span> '
        '<span class="keyterms_link">Customer</span>'
    )
    fields = extract_fields(template)
    assert fields == ["Customer"]


def test_extract_fields_normalizes_smart_apostrophe():
    template = (
        '<span class="keyterms_link">Customer</span> and '
        '<span class="keyterms_link">Customer\u2019s</span>'
    )
    fields = extract_fields(template)
    # "Customer's" is a possessive of "Customer" — should be omitted
    assert "Customer" in fields
    assert "Customer\u2019s" not in fields
    assert "Customer's" not in fields


def test_replace_spans_resolves_possessive_via_base():
    from services.doc_renderer import _replace_spans

    text = '<span class="keyterms_link">Customer\u2019s</span> obligation'
    result = _replace_spans(text, {"Customer": "Acme Corp"})
    assert "Acme Corp's" in result


# --- API tests for /api/doc-chat ---


async def test_doc_chat_returns_200(client):
    mock_choice = MagicMock()
    mock_choice.message.content = (
        '{"reply": "Hello! What is the name of the Customer?", '
        '"fields": {"Customer": null, "Provider": null}, "complete": false}'
    )
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]

    with patch("services.doc_chat.completion", return_value=mock_completion):
        r = await client.post(
            "/api/doc-chat",
            json={"doc_type": "csa", "messages": [], "current_fields": {}},
        )

    assert r.status_code == 200
    data = r.json()
    assert "reply" in data
    assert "fields" in data
    assert "complete" in data


async def test_doc_chat_unknown_doc_type_returns_400(client):
    r = await client.post(
        "/api/doc-chat",
        json={"doc_type": "unknown-doc", "messages": [], "current_fields": {}},
    )
    assert r.status_code == 400


async def test_doc_template_endpoint_returns_text(client):
    r = await client.get("/api/doc-templates/csa")
    assert r.status_code == 200
    assert "Cloud Service Agreement" in r.text or len(r.text) > 100


async def test_doc_template_unknown_slug_returns_404(client):
    r = await client.get("/api/doc-templates/nonexistent")
    assert r.status_code == 404


async def test_generate_doc_returns_html(client):
    r = await client.post(
        "/api/generate-doc",
        json={
            "doc_type": "csa",
            "fields": {"Customer": "Acme Corp", "Provider": "Tech Inc"},
            "title": "Cloud Service Agreement",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "html" in data
    assert "Acme Corp" in data["html"]
    assert "Tech Inc" in data["html"]
