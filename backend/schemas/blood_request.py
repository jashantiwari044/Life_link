import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel

from backend.schemas.organization import OrganizationBrief


class BloodRequestBase(BaseModel):
    patient_name: str
    blood_group_required: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    units_required: int
    hospital_id: Optional[int] = None
    priority: Literal["EMERGENCY", "URGENT", "PLANNED"]
    emergency_reason: Optional[str] = None


class BloodRequestCreate(BloodRequestBase):
    hospital_id: int


class HospitalBloodRequestCreate(BloodRequestBase):
    requester_id: Optional[int] = None
    blood_bank_id: Optional[int] = None


class BloodRequestResponse(BloodRequestBase):
    id: int
    requester_id: Optional[int] = None
    status: str
    created_at: datetime.datetime
    # Embedded so every consumer renders the hospital name instead of a raw id.
    hospital: Optional[OrganizationBrief] = None
    # The blood bank handling this request — the address a donor must go to.
    assigned_blood_bank: Optional[OrganizationBrief] = None
    # Progress the hospital and requester can see once it leaves their hands.
    fulfillment_type: Optional[str] = None
    responder_count: int = 0
    collected_count: int = 0

    class Config:
        from_attributes = True


class BloodRequestForDonorResponse(BloodRequestResponse):
    is_eligible_now: bool
    # Requests are published to every donor, so say plainly whether this one's
    # blood group can actually help, and who can.
    is_blood_type_match: bool = True
    compatible_donor_groups: List[str] = []
    # This donor's own commitment on this request, so the UI survives a reload:
    # None (never responded), ACCEPTED (owes a donation), BLOOD_COLLECTED (done).
    my_response_status: Optional[str] = None


class HospitalVerifyRequest(BaseModel):
    approve: bool
    rejection_reason: Optional[str] = None
