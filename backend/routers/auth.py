from fastapi import APIRouter, Cookie, HTTPException, Response

from database import get_db
from models.auth import AuthResponse, SigninRequest, SignupRequest
from services.auth import (
    create_session,
    get_user_by_session,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest, response: Response):
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    db = get_db()
    try:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")
        cursor = db.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (req.email, hash_password(req.password)),
        )
        db.commit()
        user_id = cursor.lastrowid
    finally:
        db.close()
    token = create_session(user_id)
    response.set_cookie(
        "session", token, httponly=True, samesite="lax", max_age=86400,
    )
    return AuthResponse(email=req.email)


@router.post("/signin", response_model=AuthResponse)
async def signin(req: SigninRequest, response: Response):
    db = get_db()
    try:
        row = db.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?", (req.email,),
        ).fetchone()
    finally:
        db.close()
    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_session(row["id"])
    response.set_cookie(
        "session", token, httponly=True, samesite="lax", max_age=86400,
    )
    return AuthResponse(email=row["email"])


@router.post("/signout")
async def signout(response: Response, session: str | None = Cookie(None)):
    if session:
        db = get_db()
        try:
            db.execute("DELETE FROM sessions WHERE id = ?", (session,))
            db.commit()
        finally:
            db.close()
    response.delete_cookie("session")
    return {"ok": True}


@router.get("/me", response_model=AuthResponse)
async def me(session: str | None = Cookie(None)):
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = get_user_by_session(session)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired")
    return AuthResponse(email=user["email"])
