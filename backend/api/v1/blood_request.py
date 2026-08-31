from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import User
from backend.schemas.blood_request import BloodRequestCreate, BloodRequestResponse
from backend.services.blood_request_service import BloodRequestService

router = APIRouter()


@router.post("", response_model=BloodRequestResponse, status_code=status.HTTP_201_CREATED)
def create_blood_request(
    request_in: BloodRequestCreate,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Submit a new blood request tied to a hospital. Starts 'PENDING' until the
    hospital verifies it.
    """
    return BloodRequestService.create_request(db=db, requester_id=current_user.id, request_in=request_in)


@router.get("/mine", response_model=List[BloodRequestResponse])
def list_my_blood_requests(
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Get all active and past blood requests submitted by the authenticated user.
    """
    return BloodRequestService.list_my_requests(db=db, requester_id=current_user.id)


@router.get("/{id}", response_model=BloodRequestResponse)
def get_blood_request_detail(
    id: int,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Get the details of a specific blood request. Enforces ownership check.
    """
    return BloodRequestService.get_request_detail(db=db, request_id=id, requester_id=current_user.id)


@router.delete("/{id}", response_model=BloodRequestResponse)
def cancel_blood_request(
    id: int,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Cancel an owned blood request if not yet fulfilled.
    """
    return BloodRequestService.cancel_request(db=db, request_id=id, requester_id=current_user.id)


@router.patch("/{id}/cancel", response_model=BloodRequestResponse)
def cancel_blood_request_patch(
    id: int,
    current_user: User = Depends(require_roles("user", "admin")),
    db: Session = Depends(get_db)
):
    """
    Cancel an owned blood request if not yet fulfilled (REST semantic update).
    """
    return BloodRequestService.cancel_request(db=db, request_id=id, requester_id=current_user.id)
