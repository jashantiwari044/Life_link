import datetime
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.models import User, CommunityResponse, BloodRequest
from backend.schemas.user import UserUpdate
from backend.services.notification_service import NotificationService
from backend.services.blood_compatibility import can_donate, compatible_donor_groups

ELIGIBILITY_COOLDOWN_DAYS = 90


class UserService:
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def update_user_profile(db: Session, current_user: User, update_in: UserUpdate) -> User:
        update_data = update_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def toggle_donor_mode(db: Session, current_user: User, enabled: bool) -> User:
        current_user.donor_mode_enabled = enabled
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def update_location(db: Session, current_user: User, lat: float, lng: float) -> User:
        current_user.current_lat = lat
        current_user.current_lng = lng
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return current_user

    @staticmethod
    def get_donation_history(db: Session, user_id: int) -> List[CommunityResponse]:
        return db.query(CommunityResponse).filter(
            CommunityResponse.donor_id == user_id
        ).order_by(CommunityResponse.timestamp.desc()).all()

    @staticmethod
    def is_eligible_donor(user: User) -> bool:
        if not user.donor_mode_enabled:
            return False
        if user.last_donation_date is None:
            return True
        days_since = (datetime.date.today() - user.last_donation_date).days
        return days_since >= ELIGIBILITY_COOLDOWN_DAYS

    @staticmethod
    def list_published_requests(db: Session, skip: int = 0, limit: int = 100) -> List[BloodRequest]:
        return db.query(BloodRequest).filter(
            BloodRequest.status == "OPEN"
        ).order_by(BloodRequest.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def respond_to_request(db: Session, donor_id: int, request_id: int) -> CommunityResponse:
        donor = UserService.get_user_by_id(db, donor_id)
        if not UserService.is_eligible_donor(donor):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are not currently eligible to donate"
            )

        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )

        # Requests are published to every donor, so guard the one thing that
        # cannot work: blood that the patient's body would reject. Without this
        # the donor makes a wasted trip and the bank holds a slot it cannot use.
        if not can_donate(donor.blood_group, request.blood_group_required):
            helpers = ", ".join(compatible_donor_groups(request.blood_group_required))
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Your blood group ({donor.blood_group}) cannot be given to a patient "
                    f"needing {request.blood_group_required}. Donors with {helpers} can help — "
                    "please share this request with someone eligible."
                )
            )

        existing = db.query(CommunityResponse).filter(
            CommunityResponse.request_id == request_id,
            CommunityResponse.donor_id == donor_id
        ).first()
        if existing:
            return existing

        response = CommunityResponse(
            request_id=request_id,
            responder_type="DONOR",
            donor_id=donor_id,
            status="ACCEPTED"
        )
        db.add(response)
        db.commit()
        db.refresh(response)

        NotificationService.notify_response_fanout(
            db, request, f"A donor has responded to blood request #{request.id}."
        )

        # Tell the donor what to actually do next. Committing to donate is
        # useless if nobody says where to turn up.
        centre = request.assigned_blood_bank
        if centre:
            where = f"Please visit {centre.org_name}, {centre.address}. Contact: {centre.poc_contact}."
        else:
            where = "The blood bank handling this request will contact you with collection details."
        NotificationService.create_notification(
            db=db,
            recipient_id=donor_id,
            recipient_type="user",
            title="Next Step: Donate Your Blood",
            message=(
                f"Thank you for committing to donate {request.blood_group_required} blood for "
                f"{request.patient_name}. {where} Your donation is not complete until the blood "
                "bank collects and verifies it."
            )
        )

        return response

    @staticmethod
    def get_my_response_statuses(db: Session, donor_id: int, request_ids: List[int]) -> dict:
        """Map request_id -> this donor's own response status.

        Lets the published-requests list show 'you already committed' after a
        page reload, instead of offering Respond again as if nothing happened.
        """
        if not request_ids:
            return {}
        rows = db.query(CommunityResponse).filter(
            CommunityResponse.donor_id == donor_id,
            CommunityResponse.request_id.in_(request_ids)
        ).all()
        return {row.request_id: row.status for row in rows}

    @staticmethod
    def get_nearby_sos_requests(db: Session, lat: float, lng: float, blood_group: str) -> List[BloodRequest]:
        # Bounding box filter for roughly 50km radius: 1 degree approx 111km, so 50km approx 0.45 degrees.
        return db.query(BloodRequest).join(User, BloodRequest.requester_id == User.id).filter(
            User.current_lat >= lat - 0.45,
            User.current_lat <= lat + 0.45,
            User.current_lng >= lng - 0.45,
            User.current_lng <= lng + 0.45,
            BloodRequest.blood_group_required == blood_group,
            BloodRequest.status == "OPEN"
        ).all()
