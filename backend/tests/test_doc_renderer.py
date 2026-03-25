from services.doc_renderer import _replace_spans, render_generic_doc


def test_replace_spans_fills_values():
    text = '<span class="keyterms_link">Customer</span> and <span class="keyterms_link">Provider</span>'
    result = _replace_spans(text, {"Customer": "Acme Corp", "Provider": "Tech Inc"})
    assert "Acme Corp" in result
    assert "Tech Inc" in result
    assert "keyterms_link" not in result


def test_replace_spans_uses_placeholder_for_missing():
    text = '<span class="keyterms_link">Customer</span>'
    result = _replace_spans(text, {})
    assert "[Customer]" in result


def test_replace_spans_all_link_types():
    text = (
        '<span class="keyterms_link">A</span> '
        '<span class="coverpage_link">B</span> '
        '<span class="orderform_link">C</span> '
        '<span class="sow_link">D</span>'
    )
    result = _replace_spans(text, {"A": "1", "B": "2", "C": "3", "D": "4"})
    assert "1" in result
    assert "2" in result
    assert "3" in result
    assert "4" in result


def test_render_generic_doc_returns_html():
    html = render_generic_doc("csa", {"Customer": "Acme", "Provider": "Tech Inc"})
    assert "<!DOCTYPE html>" in html
    assert "Acme" in html
    assert "Tech Inc" in html


def test_render_generic_doc_includes_key_terms():
    html = render_generic_doc("psa", {"Customer": "BigCo", "Provider": "SmallCo"})
    assert "Key Terms" in html
    assert "BigCo" in html
    assert "SmallCo" in html


def test_render_generic_doc_empty_fields_shows_placeholders():
    html = render_generic_doc("csa", {})
    # Should still produce valid HTML
    assert "<!DOCTYPE html>" in html
    assert "[Customer]" in html or "[Provider]" in html


def test_render_generic_doc_converts_header_spans():
    """Header spans (header_2, header_3) should render as bold text, not raw HTML."""
    html = render_generic_doc("csa", {})
    assert '<span class="header_2"' not in html
    assert '<span class="header_3"' not in html


def test_render_coverpage_replaces_bracket_placeholders():
    html = render_generic_doc(
        "mutual-nda-coverpage",
        {"Purpose": "Business evaluation", "Effective Date": "2026-01-01"},
    )
    assert "Business evaluation" in html
    assert "2026-01-01" in html
    assert "[Today's date]" not in html
