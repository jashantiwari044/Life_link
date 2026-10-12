from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import Organization
from backend.schemas.donation_camp import DonationCampCreate, DonationCampResponse
from backend.schemas.blood_request import BloodRequestResponse
from backend.schemas.community_response import CommunityResponseResponse
from backend.schemas.shortage_alert import ShortageAlertResponse
from backend.services.ngo_service import NGOService

router = APIRouter()


@router.get("/shortage-alerts", response_model=List[ShortageAlertResponse])
def list_blood_bank_shortage_alerts(
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    List blood bank shortage alerts requesting NGOs to organize blood donation drives.
    """
    return NGOService.list_shortage_alerts(db=db)


@router.post("/camps", response_model=DonationCampResponse)
def publish_donation_camp(
    camp_in: DonationCampCreate,
    shortage_alert_id: Optional[int] = Query(None, description="Optional shortage alert ID this camp responds to"),
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    Publish a new donation drive (camp). Can optionally link to a blood bank shortage alert.
    """
    return NGOService.create_camp(
        db=db, ngo_id=current_org.id, camp_in=camp_in, shortage_alert_id=shortage_alert_id
    )


@router.get("/camps", response_model=List[DonationCampResponse])
def list_my_donation_camps(
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    List all donation drives created by the authenticated NGO.
    """
    return NGOService.list_camps(db=db, ngo_id=current_org.id)


@router.get("/camps/{id}", response_model=DonationCampResponse)
def get_donation_camp_detail(
    id: int,
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    Get detailed profile of a specific donation camp.
    """
    return NGOService.get_camp_detail(db=db, camp_id=id)


@router.patch("/camps/{id}/end", response_model=DonationCampResponse)
def end_donation_camp(
    id: int,
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    End/complete a donation drive. Marks it completed and removes from public user dashboards.
    """
    return NGOService.end_camp(db=db, camp_id=id, ngo_id=current_org.id)


@router.delete("/camps/{id}", response_model=DonationCampResponse)
def remove_donation_camp(
    id: int,
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    Remove a published donation drive. Enforces ownership check.
    """
    return NGOService.delete_camp(db=db, camp_id=id, ngo_id=current_org.id)


@router.get("/active-requests", response_model=List[BloodRequestResponse])
def list_active_community_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    Get all active community requests that are open for volunteer responses.
    """
    return NGOService.list_active_blood_requests(db=db, skip=skip, limit=limit)


@router.get("/active-requests/{id}", response_model=BloodRequestResponse)
def get_active_request_detail(
    id: int,
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    Fetch a single blood request by ID.

    Unlike the list endpoint this does not filter by status, so the detail
    page keeps working even after a request moves past OPEN.
    """
    return NGOService.get_request_by_id(db=db, request_id=id)


@router.post("/active-requests/{id}/respond", response_model=CommunityResponseResponse)
def respond_to_community_request(
    id: int,
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    NGO responds as a community responder to a specific open blood request.
    """
    return NGOService.respond_to_request(db=db, ngo_id=current_org.id, request_id=id)


@router.get("/my-responses", response_model=List[CommunityResponseResponse])
def list_my_responses(
    current_org: Organization = Depends(require_roles("ngo")),
    db: Session = Depends(get_db)
):
    """
    All blood requests this NGO has committed to (accepted or collected),
    newest first. Used by the dashboard and the active-requests list to
    show whether the NGO already responded to a particular request.
    """
    return NGOService.list_my_responses(db=db, ngo_id=current_org.id)
