from pydantic import BaseModel

from models.chat import ChatMessage


class DocChatRequest(BaseModel):
    doc_type: str  # slug, e.g. "csa"
    messages: list[ChatMessage]
    current_fields: dict[str, str | None] = {}


class DocChatResponse(BaseModel):
    reply: str
    fields: dict[str, str | None] = {}
    complete: bool = False


class DocGenerateRequest(BaseModel):
    doc_type: str
    fields: dict[str, str | None]
    title: str = ""
