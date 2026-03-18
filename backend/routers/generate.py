from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from models.nda import NdaRequest, NdaResponse
from services.renderer import get_template_text, render_nda

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/templates/{template_name}", response_class=PlainTextResponse)
def get_template(template_name: str) -> str:
    try:
        return get_template_text(template_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/generate", response_model=NdaResponse)
def generate_nda(data: NdaRequest) -> NdaResponse:
    try:
        html = render_nda(data)
        return NdaResponse(html=html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rendering failed: {str(e)}")
