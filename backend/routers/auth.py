from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", status_code=501)
async def signup():
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/signin", status_code=501)
async def signin():
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/me", status_code=401)
async def me():
    raise HTTPException(status_code=401, detail="Unauthorized")
