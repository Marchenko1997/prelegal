import pytest
from services.renderer import (
    _format_date,
    _build_mnda_term_text,
    _build_confidentiality_term_text,
    render_cover_page,
    render_standard_terms,
)
from models.nda import NdaRequest

VALID_PARTY = {
    "signature": "data:image/png;base64,abc",
    "print_name": "Alice Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "notice_address": "123 Main St",
    "date": "2026-03-18",
}


def make_request(**kwargs):
    base = {
        "purpose": "Partnership eval",
        "effective_date": "2026-03-18",
        "mnda_term_type": "expires",
        "mnda_term_years": 2,
        "confidentiality_term_type": "years",
        "confidentiality_term_years": 3,
        "governing_law_state": "Delaware",
        "jurisdiction": "Wilmington, DE",
        "party1": VALID_PARTY,
        "party2": VALID_PARTY,
    }
    base.update(kwargs)
    return NdaRequest(**base)


# --- _format_date ---

def test_format_date_valid():
    assert _format_date("2026-03-18") == "March 18, 2026"


def test_format_date_invalid_passthrough():
    assert _format_date("not-a-date") == "not-a-date"


# --- term text builders ---

def test_mnda_term_expires():
    assert _build_mnda_term_text(make_request(mnda_term_type="expires", mnda_term_years=3)) == "3 year(s) from Effective Date"


def test_mnda_term_perpetual():
    assert _build_mnda_term_text(make_request(mnda_term_type="perpetual", mnda_term_years=None)) == "until terminated"


def test_confidentiality_years():
    assert _build_confidentiality_term_text(make_request(confidentiality_term_type="years", confidentiality_term_years=5)) == "5 year(s) from Effective Date"


def test_confidentiality_perpetual():
    assert _build_confidentiality_term_text(make_request(confidentiality_term_type="perpetual", confidentiality_term_years=None)) == "in perpetuity"


# --- render_cover_page (uses minimal template strings, not real template files) ---

# This template uses the exact placeholder strings the renderer searches for.
MINIMAL_COVER = """\
Purpose: [Evaluating whether to enter into a business relationship with the other party.]
Date: [Today's date]
- [x]     Expires [1 year(s)] from Effective Date.
- [ ]     Continues until terminated in accordance with the terms of the MNDA.
- [x]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- [ ]     In perpetuity.
Law: [Fill in state]
Court: [Fill in city or county and state, i.e. "courts located in New Castle, DE"]
Mods: List any modifications to the MNDA
"""


def test_cover_purpose_replaced():
    html = render_cover_page(make_request(purpose="Test partnership"), MINIMAL_COVER)
    assert "Test partnership" in html


def test_cover_date_replaced():
    html = render_cover_page(make_request(effective_date="2026-03-18"), MINIMAL_COVER)
    assert "March 18, 2026" in html


def test_cover_mnda_expires_year_count():
    html = render_cover_page(make_request(mnda_term_type="expires", mnda_term_years=2), MINIMAL_COVER)
    assert "Expires 2 year(s)" in html


def test_cover_mnda_perpetual_unchecks_expires():
    html = render_cover_page(make_request(mnda_term_type="perpetual", mnda_term_years=None), MINIMAL_COVER)
    assert "Continues until terminated" in html


def test_cover_confidentiality_years_count():
    html = render_cover_page(make_request(confidentiality_term_type="years", confidentiality_term_years=4), MINIMAL_COVER)
    assert "4 year(s) from Effective Date" in html


def test_cover_governing_law_replaced():
    html = render_cover_page(make_request(governing_law_state="California"), MINIMAL_COVER)
    assert "California" in html


def test_cover_jurisdiction_replaced():
    html = render_cover_page(make_request(jurisdiction="San Francisco, CA"), MINIMAL_COVER)
    assert "San Francisco, CA" in html


def test_cover_no_modifications():
    html = render_cover_page(make_request(modifications=None), MINIMAL_COVER)
    assert "No modifications" in html


def test_cover_with_modifications():
    html = render_cover_page(make_request(modifications="Add clause 5A"), MINIMAL_COVER)
    assert "Add clause 5A" in html


def test_cover_xss_escaped():
    """Backend HTML-escapes user input to prevent stored XSS."""
    html = render_cover_page(make_request(purpose="<script>alert(1)</script>"), MINIMAL_COVER)
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


# --- render_standard_terms ---

MINIMAL_TERMS = """\
For: <span class="coverpage_link">Purpose</span>.
Date: <span class="coverpage_link">Effective Date</span>.
MNDA: <span class="coverpage_link">MNDA Term</span>.
Conf: <span class="coverpage_link">Term of Confidentiality</span>.
Law: <span class="coverpage_link">Governing Law</span>.
Court: <span class="coverpage_link">Jurisdiction</span>.
"""


def test_terms_replaces_all_six_spans():
    req = make_request()
    html = render_standard_terms(req, MINIMAL_TERMS)
    assert "Partnership eval" in html
    assert "March 18, 2026" in html
    assert "2 year(s) from Effective Date" in html  # MNDA Term
    assert "3 year(s) from Effective Date" in html  # Term of Confidentiality
    assert "Delaware" in html
    assert "Wilmington, DE" in html


def test_terms_no_leftover_spans():
    html = render_standard_terms(make_request(), MINIMAL_TERMS)
    assert 'class="coverpage_link"' not in html
