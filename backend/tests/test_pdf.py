import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from main import app
from services.pdf import render_pdf


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_render_pdf_basic():
    pdf = await render_pdf("<h1>Hello</h1><p>World</p>")
    assert pdf[:4] == b"%PDF"


async def test_render_pdf_with_unicode():
    html = "<p>Party\u2019s obligation under \u201cSection 1\u201d</p>"
    pdf = await render_pdf(html)
    assert pdf[:4] == b"%PDF"


async def test_render_pdf_with_styles():
    html = """<!DOCTYPE html><html><head>
    <style>body { font-family: 'Times New Roman', serif; font-size: 11pt; }</style>
    </head><body><h1>Styled</h1><p>Content</p></body></html>"""
    pdf = await render_pdf(html)
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 1000  # styled doc should be nontrivial


async def test_pdf_endpoint_returns_pdf(client):
    resp = await client.post(
        "/api/pdf",
        json={"html": "<p>Hello world</p>", "filename": "test.pdf"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert b"%PDF" in resp.content


async def test_pdf_endpoint_handles_unicode(client):
    resp = await client.post(
        "/api/pdf",
        json={"html": "<p>Party\u2019s obligation under \u201cSection 1\u201d</p>"},
    )
    assert resp.status_code == 200
    assert b"%PDF" in resp.content


async def test_pdf_endpoint_full_document(client):
    html = """<!DOCTYPE html><html><head>
    <style>body { font-family: serif; } table { border-collapse: collapse; }
    td { border: 1px solid #000; padding: 8px; }</style>
    </head><body>
    <h1>Test Agreement</h1>
    <table><tr><td>Party 1</td><td>Party 2</td></tr></table>
    </body></html>"""
    resp = await client.post("/api/pdf", json={"html": html})
    assert resp.status_code == 200
    assert b"%PDF" in resp.content
