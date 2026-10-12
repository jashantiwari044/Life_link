from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.models import DonationCamp, BloodRequest, CommunityResponse, ShortageAlert, Organization
from backend.schemas.donation_camp import DonationCampCreate
from backend.services.notification_service import NotificationService


class NGOService:
    @staticmethod
    def list_shortage_alerts(db: Session) -> List[ShortageAlert]:
        """List blood bank shortage alerts asking NGOs to organize donation drives."""
        return db.query(ShortageAlert).order_by(ShortageAlert.created_at.desc()).all()

    @staticmethod
    def create_camp(
        db: Session, ngo_id: int, camp_in: DonationCampCreate, shortage_alert_id: Optional[int] = None
    ) -> DonationCamp:
        db_camp = DonationCamp(
            ngo_id=ngo_id,
            title=camp_in.title,
            venue=camp_in.venue,
            date_time=camp_in.date_time,
            contact_info=camp_in.contact_info,
            latitude=camp_in.latitude,
            longitude=camp_in.longitude,
            status="ACTIVE"
        )
        db.add(db_camp)
        db.flush()

        if shortage_alert_id:
            alert = db.query(ShortageAlert).filter(ShortageAlert.id == shortage_alert_id).first()
            if alert:
                alert.status = "DRIVE_SCHEDULED"
                db.add(alert)
                ngo = db.query(Organization).filter(Organization.id == ngo_id).first()
                ngo_name = ngo.org_name if ngo else "An NGO"
                NotificationService.create_notification(
                    db=db,
                    recipient_id=alert.blood_bank_id,
                    recipient_type="org",
                    title="Blood Donation Drive Scheduled",
                    message=f"{ngo_name} scheduled a drive '{db_camp.title}' at {db_camp.venue} in response to your {alert.blood_group} shortage alert."
                )

        db.commit()
        db.refresh(db_camp)
        return db_camp

    @staticmethod
    def list_camps(db: Session, ngo_id: int) -> List[DonationCamp]:
        return db.query(DonationCamp).filter(
            DonationCamp.ngo_id == ngo_id
        ).order_by(DonationCamp.date_time.asc()).all()

    @staticmethod
    def get_camp_detail(db: Session, camp_id: int) -> DonationCamp:
        camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation camp not found"
            )
        return camp

    @staticmethod
    def delete_camp(db: Session, camp_id: int, ngo_id: int) -> DonationCamp:
        camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation camp not found"
            )
        if camp.ngo_id != ngo_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this donation camp"
            )
        _ = camp.ngo
        db.delete(camp)
        db.commit()
        return camp

    @staticmethod
    def end_camp(db: Session, camp_id: int, ngo_id: int) -> DonationCamp:
        camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Donation camp not found"
            )
        if camp.ngo_id != ngo_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this donation camp"
            )
        camp.status = "COMPLETED"
        db.add(camp)
        db.commit()
        db.refresh(camp)
        return camp

    @staticmethod
    def list_active_blood_requests(db: Session, skip: int = 0, limit: int = 100) -> List[BloodRequest]:
        # Return all open community blood requests with pagination
        return db.query(BloodRequest).filter(
            BloodRequest.status == "OPEN"
        ).order_by(BloodRequest.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def respond_to_request(db: Session, ngo_id: int, request_id: int) -> CommunityResponse:
        # Check request exists
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )

        # Check if already responded
        existing = db.query(CommunityResponse).filter(
            CommunityResponse.request_id == request_id,
            CommunityResponse.ngo_id == ngo_id
        ).first()
        if existing:
            return existing

        response = CommunityResponse(
            request_id=request_id,
            responder_type="NGO",
            ngo_id=ngo_id,
            status="ACCEPTED"
        )
        db.add(response)
        db.commit()
        db.refresh(response)

        NotificationService.notify_response_fanout(
            db, request, f"An NGO has responded to blood request #{request.id}."
        )

        return response

    @staticmethod
    def list_my_responses(db: Session, ngo_id: int) -> List[CommunityResponse]:
        """All CommunityResponse rows where this NGO is the responder,
        ordered newest first so the dashboard shows recent activity at the top."""
        return (
            db.query(CommunityResponse)
            .filter(CommunityResponse.ngo_id == ngo_id)
            .order_by(CommunityResponse.timestamp.desc())
            .all()
        )

    @staticmethod
    def get_request_by_id(db: Session, request_id: int) -> BloodRequest:
        """Fetch a single blood request by ID with no status filter.

        The detail page used to re-fetch the full active list and scan it,
        which broke once the request moved past OPEN. This lets the page load
        the right data regardless of the current status.
        """
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )
        return request
