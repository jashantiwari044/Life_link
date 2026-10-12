import datetime
from typing import Literal, Optional
from pydantic import BaseModel
from backend.schemas.organization import OrganizationBrief


class ShortageAlertCreate(BaseModel):
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "ALL"]
    units_needed: int
    urgency: Literal["MEDIUM", "HIGH", "CRITICAL", "EMERGENCY", "URGENT", "PLANNED"] = "HIGH"
    message: str


class ShortageAlertResponse(BaseModel):
    id: int
    blood_bank_id: int
    blood_group: str
    units_needed: int
    urgency: str
    message: str
    status: str
    created_at: datetime.datetime
    blood_bank: Optional[OrganizationBrief] = None

    class Config:
        from_attributes = True
