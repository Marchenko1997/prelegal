from fastapi import APIRouter, HTTPException

from models.chat import ChatRequest, ChatResponse
from services.chat import call_chat

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    try:
        return call_chat(req.messages, req.current_fields)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
