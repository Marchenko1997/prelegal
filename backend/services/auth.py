import uuid

import bcrypt
from fastapi import Cookie, HTTPException

from database import get_db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_session(user_id: int) -> str:
    """Insert a new session row and return the token."""
    token = uuid.uuid4().hex
    db = get_db()
    try:
        db.execute("INSERT INTO sessions (id, user_id) VALUES (?, ?)", (token, user_id))
        db.commit()
    finally:
        db.close()
    return token


def get_user_by_session(token: str) -> dict | None:
    """Look up the user for a session token. Returns {id, email} or None."""
    db = get_db()
    try:
        row = db.execute(
            "SELECT u.id, u.email FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.id = ?",
            (token,),
        ).fetchone()
    finally:
        db.close()
    if row is None:
        return None
    return {"id": row["id"], "email": row["email"]}


def require_session(session: str | None = Cookie(None)) -> dict:
    """FastAPI dependency -- returns user dict or raises 401."""
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_user_by_session(session)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired")
    return user
