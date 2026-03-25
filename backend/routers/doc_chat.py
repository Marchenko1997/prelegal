from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from models.doc_chat import DocChatRequest, DocChatResponse, DocGenerateRequest
from services.doc_chat import call_doc_chat, get_template
from services.doc_renderer import render_generic_doc

router = APIRouter(prefix="/api")


@router.post("/doc-chat", response_model=DocChatResponse)
def doc_chat(req: DocChatRequest) -> DocChatResponse:
    try:
        return call_doc_chat(req.doc_type, req.messages, req.current_fields)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.get("/doc-templates/{slug}", response_class=PlainTextResponse)
def get_doc_template(slug: str) -> str:
    try:
        return get_template(slug)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/generate-doc")
def generate_doc(req: DocGenerateRequest) -> dict:
    try:
        html = render_generic_doc(req.doc_type, req.fields, req.title)
        return {"html": html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rendering failed: {str(e)}")
