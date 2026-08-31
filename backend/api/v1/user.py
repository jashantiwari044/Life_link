from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import User
from backend.schemas.user import UserResponse, UserUpdate, DonorModeToggle, LocationUpdate
from backend.schemas.community_response import CommunityResponseResponse
from backend.schemas.blood_request import BloodRequestResponse, BloodRequestForDonorResponse
from backend.services.user_service import UserService
from backend.services.blood_compatibility import can_donate, compatible_donor_groups

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(require_roles("user", "admin")), db: Session = Depends(get_db)):
    """
    Get own profile details for the authenticated user.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
def update_profile(
    update_in: UserUpdate,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Update profile fields (full name, phone, address, etc.) for the authenticated user.
    """
    return UserService.update_user_profile(db=db, current_user=current_user, update_in=update_in)


@router.patch("/me/donor-mode", response_model=UserResponse)
def toggle_donor_mode(
    payload: DonorModeToggle,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Toggle donor mode availability (enabled/disabled) for the authenticated user.
    """
    return UserService.toggle_donor_mode(db=db, current_user=current_user, enabled=payload.enabled)


@router.patch("/me/location", response_model=UserResponse)
def update_location(
    payload: LocationUpdate,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Update GPS latitude and longitude coordinates for the authenticated user.
    """
    return UserService.update_location(db=db, current_user=current_user, lat=payload.latitude, lng=payload.longitude)


@router.get("/me/donation-history", response_model=List[CommunityResponseResponse])
def get_donation_history(
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Get lists of donation history (completed responses) for the authenticated user.
    """
    return UserService.get_donation_history(db=db, user_id=current_user.id)


@router.get("/published-requests", response_model=List[BloodRequestForDonorResponse])
def list_published_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Get all blood requests published to donors/NGOs (status OPEN), with an
    eligibility tag for the current donor.
    """
    requests = UserService.list_published_requests(db=db, skip=skip, limit=limit)
    is_eligible = UserService.is_eligible_donor(current_user)
    mine = UserService.get_my_response_statuses(db, current_user.id, [r.id for r in requests])
    donor_group = getattr(current_user, "blood_group", None)
    return [
        BloodRequestForDonorResponse(
            **BloodRequestResponse.model_validate(r).model_dump(),
            is_eligible_now=is_eligible,
            my_response_status=mine.get(r.id),
            is_blood_type_match=can_donate(donor_group, r.blood_group_required),
            compatible_donor_groups=compatible_donor_groups(r.blood_group_required),
        )
        for r in requests
    ]


@router.post("/requests/{id}/respond", response_model=CommunityResponseResponse)
def respond_to_published_request(
    id: int,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Donor responds/volunteers to fulfill a published (OPEN) blood request.
    """
    return UserService.respond_to_request(db=db, donor_id=current_user.id, request_id=id)


@router.get("/nearby-requests", response_model=List[BloodRequestResponse])
def get_nearby_requests(
    lat: float = Query(..., description="Latitude of the search center"),
    lng: float = Query(..., description="Longitude of the search center"),
    blood_group: str = Query(..., description="Target blood group required"),
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Get nearby open SOS requests matching the coordinates and blood group.
    """
    return UserService.get_nearby_sos_requests(db=db, lat=lat, lng=lng, blood_group=blood_group)
