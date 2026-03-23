from typing import Literal, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatNdaFields(BaseModel):
    """All NDA text fields, fully optional — populated progressively by the AI."""

    purpose: Optional[str] = None
    effective_date: Optional[str] = None  # YYYY-MM-DD
    mnda_term_type: Optional[Literal["expires", "perpetual"]] = None
    mnda_term_years: Optional[int] = None
    confidentiality_term_type: Optional[Literal["years", "perpetual"]] = None
    confidentiality_term_years: Optional[int] = None
    governing_law_state: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None
    party1_print_name: Optional[str] = None
    party1_title: Optional[str] = None
    party1_company: Optional[str] = None
    party1_notice_address: Optional[str] = None
    party2_print_name: Optional[str] = None
    party2_title: Optional[str] = None
    party2_company: Optional[str] = None
    party2_notice_address: Optional[str] = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    current_fields: ChatNdaFields = ChatNdaFields()


class ChatResponse(BaseModel):
    reply: str
    fields: ChatNdaFields
