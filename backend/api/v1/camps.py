from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import User
from backend.schemas.donation_camp import DonationCampResponse, CampRegistrationResponse
from backend.services.donation_camp_service import DonationCampService

router = APIRouter()


@router.get("", response_model=List[DonationCampResponse])
def get_upcoming_camps(
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(require_roles("user", "admin", "blood_bank", "hospital", "ngo")),
    db: Session = Depends(get_db)
):
    """
    Get a list of upcoming public donation drives (camps) sorted chronologically.
    """
    return DonationCampService.list_upcoming_camps(db=db, limit=limit)


@router.get("/my-registrations", response_model=List[CampRegistrationResponse])
def get_my_camp_registrations(
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Get all camps the authenticated user has registered to attend.
    """
    return DonationCampService.list_my_camp_registrations(db=db, user_id=current_user.id)


@router.post("/{id}/register", response_model=CampRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_for_camp(
    id: int,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Register the authenticated user as an attendee/donor for a donation camp.
    """
    return DonationCampService.register_for_camp(db=db, user_id=current_user.id, camp_id=id)
