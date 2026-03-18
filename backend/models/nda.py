from typing import Literal, Optional
from pydantic import BaseModel, field_validator, model_validator


class PartyData(BaseModel):
    signature: str
    print_name: str
    title: str
    company: str
    notice_address: str
    date: str

    @field_validator("signature")
    @classmethod
    def signature_must_be_data_url(cls, v: str) -> str:
        if not v:
            raise ValueError("signature is required")
        if not v.startswith("data:image/"):
            raise ValueError("signature must be a base64 image data URL")
        return v


class NdaRequest(BaseModel):
    purpose: str
    effective_date: str
    mnda_term_type: Literal["expires", "perpetual"]
    mnda_term_years: Optional[int] = None
    confidentiality_term_type: Literal["years", "perpetual"]
    confidentiality_term_years: Optional[int] = None
    governing_law_state: str
    jurisdiction: str
    modifications: Optional[str] = None
    party1: PartyData
    party2: PartyData

    @model_validator(mode="after")
    def validate_conditional_years(self) -> "NdaRequest":
        if self.mnda_term_type == "expires" and not self.mnda_term_years:
            raise ValueError("mnda_term_years required when mnda_term_type is 'expires'")
        if self.confidentiality_term_type == "years" and not self.confidentiality_term_years:
            raise ValueError(
                "confidentiality_term_years required when confidentiality_term_type is 'years'"
            )
        return self


class NdaResponse(BaseModel):
    html: str
