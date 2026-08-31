from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import Organization
from backend.schemas.blood_request import BloodRequestResponse, HospitalVerifyRequest
from backend.schemas.organization import OrganizationResponse
from backend.schemas.hospital_blood_bank_link import LinkCreate, LinkResponse
from backend.services.hospital_service import HospitalService, HospitalBloodRequestCreate

router = APIRouter()


@router.post("/blood-requests", response_model=BloodRequestResponse)
def raise_hospital_blood_request(
    request_in: HospitalBloodRequestCreate,
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Hospital raises a new blood request for a patient.
    """
    return HospitalService.raise_blood_request(db=db, hospital_id=current_org.id, request_in=request_in)


@router.get("/blood-requests", response_model=List[BloodRequestResponse])
def list_hospital_blood_requests(
    status: Optional[str] = Query(None, description="Filter requests by status"),
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    List blood requests raised by the authenticated hospital, filterable by status.
    """
    return HospitalService.list_hospital_requests(db=db, hospital_id=current_org.id, status_filter=status)


@router.get("/blood-requests/{id}", response_model=BloodRequestResponse)
def get_hospital_blood_request_detail(
    id: int,
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Get specific blood request details. Enforces hospital ownership check.
    """
    return HospitalService.get_request_detail(db=db, request_id=id, hospital_id=current_org.id)


@router.patch("/blood-requests/{id}/verify", response_model=BloodRequestResponse)
def verify_blood_request(
    id: int,
    payload: HospitalVerifyRequest,
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Hospital accepts or rejects a pending patient blood request.
    """
    return HospitalService.verify_request(
        db=db,
        request_id=id,
        hospital_id=current_org.id,
        approve=payload.approve,
        rejection_reason=payload.rejection_reason
    )


@router.patch("/blood-requests/{id}/received", response_model=BloodRequestResponse)
def confirm_blood_received(
    id: int,
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Mark request as blood received by the hospital.
    """
    return HospitalService.confirm_blood_received(db=db, request_id=id, hospital_id=current_org.id)


@router.get("/linked-blood-bank", response_model=Optional[OrganizationResponse])
def get_linked_blood_bank(
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Get details of the blood bank currently linked and approved for this hospital. Returns null if none.
    """
    return HospitalService.get_linked_blood_bank(db=db, hospital_id=current_org.id)


@router.post("/blood-bank-link", response_model=LinkResponse)
def request_blood_bank_link(
    payload: LinkCreate,
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Request to establish an association/link with a target blood bank.
    """
    return HospitalService.request_blood_bank_link(
        db=db,
        hospital_id=current_org.id,
        blood_bank_id=payload.blood_bank_id
    )


@router.get("/blood-bank-links", response_model=List[LinkResponse])
def list_blood_bank_links(
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    List every blood bank link row for this hospital (pending, approved,
    rejected, unlinked) so the UI can label each bank correctly.
    """
    return HospitalService.list_blood_bank_links(db=db, hospital_id=current_org.id)


@router.delete("/blood-bank-link", response_model=LinkResponse)
def unlink_blood_bank(
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    End the hospital's current blood bank association so a new one can be linked.
    """
    return HospitalService.unlink_blood_bank(db=db, hospital_id=current_org.id)


@router.get("/approved-blood-banks", response_model=List[OrganizationResponse])
def search_approved_blood_banks(
    q: Optional[str] = Query(None, description="Search query for blood bank name"),
    current_org: Organization = Depends(require_roles("hospital")),
    db: Session = Depends(get_db)
):
    """
    Search approved blood banks by name for linking.
    """
    return HospitalService.search_approved_blood_banks(db=db, search_query=q)
