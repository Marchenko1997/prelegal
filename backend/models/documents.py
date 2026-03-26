from pydantic import BaseModel


class SaveDocumentRequest(BaseModel):
    doc_type: str
    title: str
    fields: dict
    html: str


class DocumentRecord(BaseModel):
    id: int
    doc_type: str
    title: str
    created_at: str
    html: str
