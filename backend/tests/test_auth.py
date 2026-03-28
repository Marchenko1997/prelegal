import pytest


async def test_signup_creates_user(client):
    r = await client.post("/api/auth/signup", json={"email": "a@b.com", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.com"
    assert "session" in r.cookies


async def test_signup_duplicate_email_returns_409(client):
    await client.post("/api/auth/signup", json={"email": "dup@b.com", "password": "password123"})
    r = await client.post("/api/auth/signup", json={"email": "dup@b.com", "password": "password123"})
    assert r.status_code == 409


async def test_signup_short_password_returns_422(client):
    r = await client.post("/api/auth/signup", json={"email": "short@b.com", "password": "short"})
    assert r.status_code == 422


async def test_signin_valid(client):
    await client.post("/api/auth/signup", json={"email": "login@b.com", "password": "password123"})
    r = await client.post("/api/auth/signin", json={"email": "login@b.com", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["email"] == "login@b.com"
    assert "session" in r.cookies


async def test_signin_wrong_password_returns_401(client):
    await client.post("/api/auth/signup", json={"email": "wrong@b.com", "password": "password123"})
    r = await client.post("/api/auth/signin", json={"email": "wrong@b.com", "password": "wrongpass1"})
    assert r.status_code == 401


async def test_signin_unknown_email_returns_401(client):
    r = await client.post("/api/auth/signin", json={"email": "nope@b.com", "password": "password123"})
    assert r.status_code == 401


async def test_me_with_valid_session(client):
    signup_r = await client.post("/api/auth/signup", json={"email": "me@b.com", "password": "password123"})
    session_cookie = signup_r.cookies["session"]
    client.cookies.set("session", session_cookie)
    r = await client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "me@b.com"


async def test_me_without_session_returns_401(client):
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


async def test_signout_clears_session(client):
    signup_r = await client.post("/api/auth/signup", json={"email": "out@b.com", "password": "password123"})
    session_cookie = signup_r.cookies["session"]
    client.cookies.set("session", session_cookie)
    r = await client.post("/api/auth/signout")
    assert r.status_code == 200
    # Session should now be invalid
    client.cookies.clear()
    client.cookies.set("session", session_cookie)
    r = await client.get("/api/auth/me")
    assert r.status_code == 401
