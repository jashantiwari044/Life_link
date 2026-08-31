import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class OrganizationBase(BaseModel):
    org_name: str
    org_type: str  # HOSPITAL, BLOOD_BANK, NGO
    poc_name: str
    poc_contact: str
    email: EmailStr
    registration_number_hrf_id: str
    address: str
    supporting_docs_url: Optional[str] = None
    # Optional map pin for the address; everything still works without it.
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("org_type")
    @classmethod
    def validate_org_type(cls, v: str) -> str:
        upper_v = v.upper()
        if upper_v not in ("HOSPITAL", "BLOOD_BANK", "NGO"):
            raise ValueError("org_type must be HOSPITAL, BLOOD_BANK, or NGO")
        return upper_v


class OrganizationCreate(OrganizationBase):
    password: str


class OrganizationResponse(OrganizationBase):
    id: int
    approval_status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class OrganizationUpdate(BaseModel):
    org_name: Optional[str] = None
    poc_name: Optional[str] = None
    poc_contact: Optional[str] = None
    address: Optional[str] = None
    supporting_docs_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OrganizationBrief(BaseModel):
    """Trimmed organization payload for embedding inside other responses."""
    id: int
    org_name: str
    org_type: str
    poc_name: str
    poc_contact: str
    address: str
    registration_number_hrf_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True
