import pytest


async def _signup_and_auth(client, email="docs@b.com"):
    """Helper: sign up and set the session cookie on the client."""
    r = await client.post("/api/auth/signup", json={"email": email, "password": "password123"})
    client.cookies.set("session", r.cookies["session"])
    return r


async def test_save_document_requires_auth(client):
    r = await client.post("/api/documents", json={
        "doc_type": "csa", "title": "Test CSA", "fields": {}, "html": "<p>test</p>",
    })
    assert r.status_code == 401


async def test_save_and_list_documents(client):
    await _signup_and_auth(client)
    r = await client.post("/api/documents", json={
        "doc_type": "csa", "title": "My CSA", "fields": {"Customer": "Acme"}, "html": "<p>csa</p>",
    })
    assert r.status_code == 201
    assert "id" in r.json()

    r = await client.get("/api/documents")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) == 1
    assert docs[0]["title"] == "My CSA"
    assert docs[0]["doc_type"] == "csa"
    assert docs[0]["html"] == "<p>csa</p>"


async def test_documents_scoped_to_user(client):
    await _signup_and_auth(client, "user1@b.com")
    await client.post("/api/documents", json={
        "doc_type": "csa", "title": "User1 Doc", "fields": {}, "html": "<p>1</p>",
    })

    # Sign up as a different user
    client.cookies.clear()
    await _signup_and_auth(client, "user2@b.com")
    r = await client.get("/api/documents")
    assert r.status_code == 200
    assert len(r.json()) == 0


async def test_list_documents_requires_auth(client):
    r = await client.get("/api/documents")
    assert r.status_code == 401
