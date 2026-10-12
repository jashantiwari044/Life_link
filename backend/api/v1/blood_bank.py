from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import Organization
from backend.schemas.blood_request import BloodRequestResponse
from backend.schemas.blood_inventory import BloodInventoryResponse, BloodInventorySet, BloodInventoryBatchUpdate
from backend.schemas.hospital_blood_bank_link import LinkResponse, LinkApproval
from backend.schemas.community_response import CommunityResponseResponse
from backend.schemas.organization import OrganizationResponse
from backend.schemas.shortage_alert import ShortageAlertCreate, ShortageAlertResponse
from backend.services.blood_bank_service import BloodBankService

router = APIRouter()


@router.get("/requests/{id}", response_model=BloodRequestResponse)
def get_request_detail(
    id: int,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Fetch a single blood request by ID for the tracking page.

    Unlike /incoming-requests this is not filtered by status, so the tracking
    page keeps working for DISPATCHED and BLOOD_RECEIVED requests.
    """
    return BloodBankService.get_request_detail(db=db, request_id=id, blood_bank_id=current_org.id)


@router.get("/incoming-requests", response_model=List[BloodRequestResponse])
def get_incoming_requests(
    priority: Optional[str] = Query(None, description="Filter requests by priority"),
    status: Optional[str] = Query(None, description="Filter requests by status"),
    include_completed: bool = Query(False, description="Include fulfilled/received requests"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Get hospital-verified patient blood requests from linked hospitals.
    """
    return BloodBankService.list_incoming_requests(
        db=db,
        blood_bank_id=current_org.id,
        priority_filter=priority,
        status_filter=status,
        include_completed=include_completed,
        skip=skip,
        limit=limit
    )


@router.get("/inventory", response_model=List[BloodInventoryResponse])
def get_inventory(
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Get current blood stock levels for every blood group.
    """
    return BloodBankService.get_inventory(db=db, blood_bank_id=current_org.id)


@router.put("/inventory", response_model=List[BloodInventoryResponse])
def set_inventory_batch(
    payload: BloodInventoryBatchUpdate,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Bulk update stock levels for multiple blood groups in one atomic call.
    """
    return BloodBankService.set_inventory_batch(db=db, blood_bank_id=current_org.id, items=payload.items)


@router.put("/inventory/{blood_group}", response_model=BloodInventoryResponse)
def set_inventory(
    blood_group: str,
    payload: BloodInventorySet,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Set the absolute unit count in stock for a given blood group.
    """
    return BloodBankService.set_inventory(
        db=db, blood_bank_id=current_org.id, blood_group=blood_group, units_available=payload.units_available
    )


@router.patch("/requests/{id}/fulfill", response_model=BloodRequestResponse)
def process_fulfillment(
    id: int,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Check inventory for a verified request: fulfill directly from stock if
    available, otherwise publish it to donors and NGOs.
    """
    return BloodBankService.process_fulfillment(db=db, request_id=id, blood_bank_id=current_org.id)


@router.patch("/requests/{id}/hold", response_model=BloodRequestResponse)
def put_on_hold(
    id: int,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Put request on hold due to insufficient inventory.
    """
    return BloodBankService.put_on_hold(db=db, request_id=id, blood_bank_id=current_org.id)


@router.patch("/requests/{id}/dispatch", response_model=BloodRequestResponse)
def mark_dispatched(
    id: int,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Mark that blood has been physically dispatched to the hospital.
    """
    return BloodBankService.mark_dispatched(db=db, request_id=id, blood_bank_id=current_org.id)


@router.patch("/community-responses/{id}/verify", response_model=CommunityResponseResponse)
def verify_donor_blood(
    id: int,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Verify and log donor blood collection from a community response. Updates last donation date.
    """
    return BloodBankService.verify_donor_blood(db=db, community_response_id=id, blood_bank_id=current_org.id)


@router.get("/link-requests", response_model=List[LinkResponse])
def list_pending_link_requests(
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    List pending hospital link association requests.
    """
    return BloodBankService.list_pending_link_requests(db=db, blood_bank_id=current_org.id)


@router.patch("/link-requests/{id}", response_model=LinkResponse)
def approve_reject_link(
    id: int,
    payload: LinkApproval,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a pending hospital link request.
    """
    return BloodBankService.approve_reject_link(
        db=db,
        link_id=id,
        blood_bank_id=current_org.id,
        approve=payload.approve
    )


@router.get("/linked-hospitals", response_model=List[OrganizationResponse])
def list_linked_hospitals(
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Get all approved linked hospital organizations.
    """
    return BloodBankService.list_linked_hospitals(db=db, blood_bank_id=current_org.id)


@router.get("/community-responses", response_model=List[CommunityResponseResponse])
def list_community_responses(
    status: Optional[str] = Query(None, description="Filter by ACCEPTED or BLOOD_COLLECTED"),
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Donor and NGO responses on requests assigned to this blood bank. Filter by
    ACCEPTED to see who has committed but not yet been checked in.
    """
    return BloodBankService.list_community_responses(
        db=db, blood_bank_id=current_org.id, status_filter=status
    )


@router.get("/donation-logs", response_model=List[CommunityResponseResponse])
def get_donation_logs(
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Get historical list of logged successful blood collections.
    """
    return BloodBankService.list_donation_logs(db=db, blood_bank_id=current_org.id)


@router.post("/shortage-alerts", response_model=ShortageAlertResponse, status_code=status.HTTP_201_CREATED)
def create_shortage_alert(
    payload: ShortageAlertCreate,
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    Blood bank reports a blood shortage and notifies all approved NGOs to schedule a blood donation drive.
    """
    return BloodBankService.create_shortage_alert(db=db, blood_bank_id=current_org.id, alert_in=payload)


@router.get("/shortage-alerts", response_model=List[ShortageAlertResponse])
def list_my_shortage_alerts(
    current_org: Organization = Depends(require_roles("blood_bank")),
    db: Session = Depends(get_db)
):
    """
    List shortage alerts and NGO drive requests created by this blood bank.
    """
    return BloodBankService.list_shortage_alerts(db=db, blood_bank_id=current_org.id)
