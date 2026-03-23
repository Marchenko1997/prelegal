import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["catalog"])

_HERE = Path(__file__).parent.parent


def _catalog_path() -> Path:
    """Find catalog.json — works in Docker (/app) and local dev (../catalog.json)."""
    for candidate in [_HERE / "catalog.json", _HERE.parent / "catalog.json"]:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("catalog.json not found")


@router.get("/catalog")
async def get_catalog():
    try:
        return json.loads(_catalog_path().read_text())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
