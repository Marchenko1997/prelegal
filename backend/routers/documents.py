import json

from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models.documents import DocumentDetail, DocumentRecord, SaveDocumentRequest
from services.auth import require_session

router = APIRouter(prefix="/api", tags=["documents"])


@router.post("/documents", status_code=201)
async def save_document(req: SaveDocumentRequest, user: dict = Depends(require_session)):
    db = get_db()
    try:
        db.execute(
            """INSERT INTO documents (user_id, doc_type, title, fields_json, html)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, doc_type) DO UPDATE SET
                title = excluded.title,
                fields_json = excluded.fields_json,
                html = excluded.html,
                updated_at = CURRENT_TIMESTAMP""",
            (user["id"], req.doc_type, req.title, json.dumps(req.fields), req.html),
        )
        db.commit()
        row = db.execute(
            "SELECT id FROM documents WHERE user_id = ? AND doc_type = ?",
            (user["id"], req.doc_type),
        ).fetchone()
        doc_id = row["id"]
    finally:
        db.close()
    return {"id": doc_id}


@router.get("/documents", response_model=list[DocumentRecord])
async def list_documents(user: dict = Depends(require_session)):
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, doc_type, title, created_at, updated_at, html FROM documents WHERE user_id = ? ORDER BY updated_at DESC",
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
            updated_at=str(r["updated_at"]),
            html=r["html"],
        )
        for r in rows
    ]


@router.get("/documents/{doc_id}", response_model=DocumentDetail)
async def get_document(doc_id: int, user: dict = Depends(require_session)):
    db = get_db()
    try:
        row = db.execute(
            "SELECT id, doc_type, title, created_at, updated_at, fields_json, html FROM documents WHERE id = ? AND user_id = ?",
            (doc_id, user["id"]),
        ).fetchone()
    finally:
        db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentDetail(
        id=row["id"],
        doc_type=row["doc_type"],
        title=row["title"],
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
        html=row["html"],
        fields=json.loads(row["fields_json"]),
    )
