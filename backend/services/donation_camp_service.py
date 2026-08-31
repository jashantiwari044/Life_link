import datetime
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.models import DonationCamp, CampRegistration


class DonationCampService:
    @staticmethod
    def list_upcoming_camps(db: Session, limit: int = 100) -> List[DonationCamp]:
        # Return active drives scheduled in the future, ordered chronologically
        now = datetime.datetime.utcnow()
        return db.query(DonationCamp).filter(
            DonationCamp.status == "ACTIVE",
            DonationCamp.date_time >= now
        ).order_by(DonationCamp.date_time.asc()).limit(limit).all()

    @staticmethod
    def register_for_camp(db: Session, user_id: int, camp_id: int) -> CampRegistration:
        # Check camp exists
        camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation camp not found"
            )

        # Check if already registered
        existing = db.query(CampRegistration).filter(
            CampRegistration.user_id == user_id,
            CampRegistration.camp_id == camp_id
        ).first()
        if existing:
            return existing

        registration = CampRegistration(camp_id=camp_id, user_id=user_id)
        db.add(registration)
        db.commit()
        db.refresh(registration)
        return registration

    @staticmethod
    def list_my_camp_registrations(db: Session, user_id: int) -> List[CampRegistration]:
        return db.query(CampRegistration).filter(
            CampRegistration.user_id == user_id
        ).order_by(CampRegistration.registered_at.desc()).all()
