import datetime
from typing import Literal
from pydantic import BaseModel, Field


class BloodInventoryResponse(BaseModel):
    id: int
    blood_bank_id: int
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    units_available: int
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class BloodInventorySet(BaseModel):
    units_available: int = Field(ge=0)


class BloodInventoryItemUpdate(BaseModel):
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    units_available: int = Field(ge=0)


class BloodInventoryBatchUpdate(BaseModel):
    items: list[BloodInventoryItemUpdate]
