import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    full_name: str
    dob: datetime.date
    blood_group: str
    phone_number: str
    email: EmailStr
    address: str
    aadhaar_number_redacted: str
    donor_mode_enabled: Optional[bool] = False
    last_donation_date: Optional[datetime.date] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None

    @field_validator('dob')
    @classmethod
    def dob_must_not_be_future(cls, v):
        today = datetime.date.today()
        if v > today:
            raise ValueError('Date of birth cannot be in the future.')
        min_date = today.replace(year=today.year - 120)
        if v < min_date:
            raise ValueError('Date of birth is unrealistically old.')
        return v


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    # Pinning the home address also seeds the coordinates used to match nearby
    # SOS requests, so donors do not have to set their location separately.
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    donor_mode_enabled: Optional[bool] = None
    last_donation_date: Optional[datetime.date] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class DonorModeToggle(BaseModel):
    enabled: bool


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float


class UserBrief(BaseModel):
    """Minimal donor identity, for the blood bank counter and donation logs."""
    id: int
    full_name: str
    blood_group: str
    phone_number: str
    # Where the donor is coming from, so the bank can map them like any other
    # pickup location rather than showing a bare address.
    address: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    address: Optional[str] = None

    class Config:
        from_attributes = True
