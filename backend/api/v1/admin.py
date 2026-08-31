from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import require_roles
from backend.core.models import User
from backend.schemas.organization import OrganizationResponse
from backend.schemas.user import UserResponse
from backend.schemas.admin import OrgApprovalPayload, PlatformStatsResponse, PlatformAnalyticsResponse
from backend.services.admin_service import AdminService

router = APIRouter()


@router.get("/org-approvals", response_model=List[OrganizationResponse])
def get_pending_orgs(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Get a list of all organizations currently pending registration approval.
    """
    return AdminService.list_pending_orgs(db=db)


@router.get("/organizations", response_model=List[OrganizationResponse])
def get_active_organizations(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Get a list of all currently active (approved) organizations.
    """
    return AdminService.list_active_orgs(db=db)


@router.patch("/org-approvals/{id}", response_model=OrganizationResponse)
def approve_reject_organization(
    id: int,
    payload: OrgApprovalPayload,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a pending organization registration. Triggers notification.
    """
    return AdminService.approve_reject_org(
        db=db,
        org_id=id,
        approve=payload.approve,
        rejection_reason=payload.rejection_reason
    )


@router.patch("/organizations/{id}/revoke", response_model=OrganizationResponse)
def revoke_organization(
    id: int,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Revoke an approved organization, setting it back to pending.
    """
    return AdminService.revoke_org(db=db, org_id=id)


@router.get("/users", response_model=List[UserResponse])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Get a paginated list of all users registered on the platform.
    """
    return AdminService.list_all_users(db=db, skip=skip, limit=limit)


@router.get("/users/{id}", response_model=UserResponse)
def get_user_detail(
    id: int,
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Get full profile details of a user for review.
    """
    return AdminService.get_user_detail(db=db, user_id=id)


@router.get("/stats", response_model=PlatformStatsResponse)
def get_platform_stats(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Get platform-level analytics and registration metrics counts.
    """
    return AdminService.get_platform_stats(db=db)


@router.get("/analytics", response_model=PlatformAnalyticsResponse)
def get_platform_analytics(
    current_admin: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive platform analytics, distributions, and reporting metrics.
    """
    return AdminService.get_platform_analytics(db=db)
