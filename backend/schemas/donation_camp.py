import datetime
from typing import Optional
from pydantic import BaseModel
from backend.schemas.organization import OrganizationBrief


class DonationCampBase(BaseModel):
    title: str
    venue: str
    date_time: datetime.datetime
    contact_info: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "ACTIVE"


class DonationCampCreate(DonationCampBase):
    pass


class DonationCampResponse(DonationCampBase):
    id: int
    ngo_id: int
    ngo: Optional[OrganizationBrief] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class CampRegistrationResponse(BaseModel):
    id: int
    camp_id: int
    user_id: int
    registered_at: datetime.datetime
    camp: DonationCampResponse

    class Config:
        from_attributes = True

