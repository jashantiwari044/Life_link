import datetime
from typing import Optional
from pydantic import BaseModel

from backend.schemas.blood_request import BloodRequestResponse
from backend.schemas.organization import OrganizationBrief
from backend.schemas.user import UserBrief


class CommunityResponseBase(BaseModel):
    request_id: int
    responder_type: str  # DONOR, NGO
    donor_id: Optional[int] = None
    ngo_id: Optional[int] = None
    status: str  # ACCEPTED, BLOOD_COLLECTED


class CommunityResponseCreate(CommunityResponseBase):
    pass


class CommunityResponseResponse(CommunityResponseBase):
    id: int
    timestamp: datetime.datetime
    # Embedded so a donor's history reads as real events rather than "Request #5",
    # and so a blood bank can see who is coming in and what for.
    request: Optional[BloodRequestResponse] = None
    donor: Optional[UserBrief] = None
    # Embedded NGO details so the blood bank can show the org name instead of
    # "NGO volunteer" when the responder is an organisation.
    ngo: Optional[OrganizationBrief] = None

    class Config:
        from_attributes = True
