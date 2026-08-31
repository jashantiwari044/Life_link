import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class HospitalBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None


class HospitalCreate(HospitalBase):
    pass


class HospitalResponse(HospitalBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True
