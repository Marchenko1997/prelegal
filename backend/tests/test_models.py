import pytest
from pydantic import ValidationError
from models.nda import NdaRequest, PartyData

VALID_PARTY = {
    "signature": "data:image/png;base64,abc123",
    "print_name": "Alice Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "notice_address": "123 Main St",
    "date": "2026-03-18",
}

VALID_REQUEST = {
    "purpose": "Partnership eval",
    "effective_date": "2026-03-18",
    "mnda_term_type": "expires",
    "mnda_term_years": 1,
    "confidentiality_term_type": "years",
    "confidentiality_term_years": 1,
    "governing_law_state": "Delaware",
    "jurisdiction": "Wilmington, DE",
    "party1": VALID_PARTY,
    "party2": VALID_PARTY,
}


def test_valid_request_passes():
    req = NdaRequest(**VALID_REQUEST)
    assert req.purpose == "Partnership eval"
    assert req.party1.print_name == "Alice Smith"


def test_signature_must_be_data_url():
    bad_party = {**VALID_PARTY, "signature": "not-a-data-url"}
    with pytest.raises(ValidationError, match="signature must be a base64 image data URL"):
        PartyData(**bad_party)


def test_empty_signature_rejected():
    bad_party = {**VALID_PARTY, "signature": ""}
    with pytest.raises(ValidationError, match="signature is required"):
        PartyData(**bad_party)


def test_mnda_term_years_required_when_expires():
    bad = {**VALID_REQUEST, "mnda_term_years": None}
    with pytest.raises(ValidationError, match="mnda_term_years required"):
        NdaRequest(**bad)


def test_mnda_term_perpetual_does_not_require_years():
    req = NdaRequest(**{**VALID_REQUEST, "mnda_term_type": "perpetual", "mnda_term_years": None})
    assert req.mnda_term_years is None


def test_confidentiality_years_required_when_years_type():
    bad = {**VALID_REQUEST, "confidentiality_term_years": None}
    with pytest.raises(ValidationError, match="confidentiality_term_years required"):
        NdaRequest(**bad)


def test_confidentiality_perpetual_does_not_require_years():
    req = NdaRequest(**{
        **VALID_REQUEST,
        "confidentiality_term_type": "perpetual",
        "confidentiality_term_years": None,
    })
    assert req.confidentiality_term_years is None


def test_modifications_is_optional():
    req = NdaRequest(**{**VALID_REQUEST, "modifications": None})
    assert req.modifications is None
