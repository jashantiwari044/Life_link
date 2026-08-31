from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.models import Organization
from backend.schemas.organization import OrganizationUpdate


class OrganizationService:
    @staticmethod
    def get_org_profile(db: Session, org_id: int) -> Organization:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )
        return org

    @staticmethod
    def update_org_profile(db: Session, current_org: Organization, update_in: OrganizationUpdate) -> Organization:
        update_data = update_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(current_org, field, value)
        
        db.add(current_org)
        db.commit()
        db.refresh(current_org)
        return current_org
