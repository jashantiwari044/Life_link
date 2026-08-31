from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import Organization
from backend.schemas.organization import OrganizationResponse, OrganizationUpdate
from backend.services.organization_service import OrganizationService

router = APIRouter()


@router.get("/me", response_model=OrganizationResponse)
def get_org_profile(
    current_org: Organization = Depends(require_roles("hospital", "blood_bank", "ngo")),
    db: Session = Depends(get_db)
):
    """
    Get own organization profile. Accessible by approved Hospital, Blood Bank, or NGO roles.
    """
    return current_org


@router.put("/me", response_model=OrganizationResponse)
def update_org_profile(
    update_in: OrganizationUpdate,
    current_org: Organization = Depends(require_roles("hospital", "blood_bank", "ngo")),
    db: Session = Depends(get_db)
):
    """
    Update own organization profile details (address, contact name, document URL, etc.).
    """
    return OrganizationService.update_org_profile(db=db, current_org=current_org, update_in=update_in)
