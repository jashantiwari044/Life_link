from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    identifier: str  # Email or 10-digit Phone Number
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
