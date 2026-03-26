import json

from fastapi import APIRouter, Depends

from database import get_db
from models.documents import DocumentRecord, SaveDocumentRequest
from services.auth import require_session

router = APIRouter(prefix="/api", tags=["documents"])


@router.post("/documents", status_code=201)
async def save_document(req: SaveDocumentRequest, user: dict = Depends(require_session)):
    db = get_db()
    try:
        cursor = db.execute(
            "INSERT INTO documents (user_id, doc_type, title, fields_json, html) VALUES (?, ?, ?, ?, ?)",
            (user["id"], req.doc_type, req.title, json.dumps(req.fields), req.html),
        )
        db.commit()
        doc_id = cursor.lastrowid
    finally:
        db.close()
    return {"id": doc_id}


@router.get("/documents", response_model=list[DocumentRecord])
async def list_documents(user: dict = Depends(require_session)):
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, doc_type, title, created_at, html FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        ).fetchall()
    finally:
        db.close()
    return [
        DocumentRecord(
            id=r["id"],
            doc_type=r["doc_type"],
            title=r["title"],
            created_at=str(r["created_at"]),
            html=r["html"],
        )
        for r in rows
    ]
