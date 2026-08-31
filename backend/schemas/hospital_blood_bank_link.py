import datetime
from typing import Optional
from pydantic import BaseModel

from backend.schemas.organization import OrganizationBrief


class LinkBase(BaseModel):
    blood_bank_id: int


class LinkCreate(LinkBase):
    pass


class LinkResponse(LinkBase):
    id: int
    hospital_id: int
    status: str  # PENDING, APPROVED, REJECTED, UNLINKED
    updated_at: Optional[datetime.datetime] = None
    # Embedded so each side can name the other instead of showing a raw id.
    hospital: Optional[OrganizationBrief] = None
    blood_bank: Optional[OrganizationBrief] = None

    class Config:
        from_attributes = True


class LinkApproval(BaseModel):
    approve: bool

