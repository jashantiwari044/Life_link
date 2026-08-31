from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from backend.core.db import get_db
from backend.core.models import Organization
from backend.schemas.auth import Token, LoginRequest
from backend.schemas.user import UserCreate, UserResponse
from backend.schemas.organization import OrganizationCreate, OrganizationResponse
from backend.services.auth_service import AuthService

router = APIRouter()


@router.get("/hospitals", response_model=List[OrganizationResponse])
def list_approved_hospitals(db: Session = Depends(get_db)):
    """
    Public endpoint: list all approved hospitals for dropdowns (e.g. blood request form).
    """
    return (
        db.query(Organization)
        .filter(Organization.org_type == "HOSPITAL", Organization.approval_status == "APPROVED")
        .all()
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new individual citizen (User).
    """
    return AuthService.register_user(db=db, user_in=user_in)


@router.post("/login", response_model=Token)
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login an individual user with email or phone number. Returns a JWT access token.
    """
    return AuthService.authenticate_user(db=db, login_data=login_data)


@router.post("/org/register", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def register_organization(org_in: OrganizationCreate, db: Session = Depends(get_db)):
    """
    Register a new organization (Hospital, Blood Bank, NGO). Status will be PENDING.
    """
    return AuthService.register_organization(db=db, org_in=org_in)


@router.post("/org/login", response_model=Token)
def login_organization(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Login an organization with email. Status must be APPROVED. Returns a JWT access token.
    """
    return AuthService.authenticate_organization(db=db, login_data=login_data)
