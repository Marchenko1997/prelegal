import pytest


async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_get_coverpage_template(client):
    r = await client.get("/api/templates/coverpage")
    assert r.status_code == 200
    # Real coverpage template contains these strings
    assert "Mutual Non-Disclosure" in r.text
    assert "PARTY 1" in r.text


async def test_get_terms_template(client):
    r = await client.get("/api/templates/terms")
    assert r.status_code == 200
    assert "coverpage_link" in r.text


async def test_get_unknown_template_returns_404(client):
    r = await client.get("/api/templates/doesnotexist")
    assert r.status_code == 404


async def test_generate_valid_payload(client, valid_payload):
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 200
    data = r.json()
    assert "html" in data
    # Party names appear in the rendered HTML
    assert "Alice Smith" in data["html"]
    assert "Bob Jones" in data["html"]
    # Effective date rendered in long form
    assert "March 18, 2026" in data["html"]


async def test_generate_missing_mnda_years_returns_422(client, valid_payload):
    valid_payload["mnda_term_type"] = "expires"
    valid_payload["mnda_term_years"] = None
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 422


async def test_generate_missing_confidentiality_years_returns_422(client, valid_payload):
    valid_payload["confidentiality_term_type"] = "years"
    valid_payload["confidentiality_term_years"] = None
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 422


async def test_generate_invalid_signature_returns_422(client, valid_payload):
    valid_payload["party1"]["signature"] = "not-a-data-url"
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 422


async def test_generate_perpetual_mnda(client, valid_payload):
    valid_payload["mnda_term_type"] = "perpetual"
    valid_payload["mnda_term_years"] = None
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 200
    assert "until terminated" in r.json()["html"]
