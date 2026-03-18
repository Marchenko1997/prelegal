import pytest
from httpx import AsyncClient, ASGITransport
from main import app

VALID_PARTY = {
    "signature": "data:image/png;base64,abc123",
    "print_name": "Alice Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "notice_address": "123 Main St, Wilmington, DE 19801",
    "date": "2026-03-18",
}

VALID_PAYLOAD = {
    "purpose": "Evaluating a potential partnership.",
    "effective_date": "2026-03-18",
    "mnda_term_type": "expires",
    "mnda_term_years": 2,
    "confidentiality_term_type": "years",
    "confidentiality_term_years": 3,
    "governing_law_state": "Delaware",
    "jurisdiction": "courts located in Wilmington, DE",
    "modifications": None,
    "party1": VALID_PARTY,
    "party2": {**VALID_PARTY, "print_name": "Bob Jones", "company": "Widget Inc"},
}


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
def valid_payload():
    import copy
    return copy.deepcopy(VALID_PAYLOAD)
