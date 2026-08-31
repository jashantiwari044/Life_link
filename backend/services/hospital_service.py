from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.core.models import (
    BloodRequest, HospitalBloodBankLink, Organization, User, RequestFulfillment, CommunityResponse
)
from backend.schemas.blood_request import BloodRequestBase
from backend.services.notification_service import NotificationService
from backend.services.request_status import assert_transition, NON_TERMINAL_STATUSES


# Specifically for hospital raising requests, requiring the requester_id (patient)
class HospitalBloodRequestCreate(BloodRequestBase):
    requester_id: int


class HospitalService:
    @staticmethod
    def raise_blood_request(db: Session, hospital_id: int, request_in: HospitalBloodRequestCreate) -> BloodRequest:
        # Validate that requester_id exists in users table
        user = db.query(User).filter(User.id == request_in.requester_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient (requester) user not found"
            )

        # Create a blood request associated with the hospital and patient user
        db_request = BloodRequest(
            requester_id=request_in.requester_id,
            patient_name=request_in.patient_name,
            blood_group_required=request_in.blood_group_required,
            units_required=request_in.units_required,
            hospital_id=hospital_id,
            priority=request_in.priority,
            emergency_reason=request_in.emergency_reason,
            status="PENDING"  # Initiated as PENDING for hospital patient requests
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def list_hospital_requests(db: Session, hospital_id: int, status_filter: Optional[str] = None) -> List[BloodRequest]:
        query = db.query(BloodRequest).filter(BloodRequest.hospital_id == hospital_id)
        if status_filter:
            query = query.filter(BloodRequest.status == status_filter)
        return query.order_by(BloodRequest.created_at.desc()).all()

    @staticmethod
    def get_request_detail(db: Session, request_id: int, hospital_id: int) -> BloodRequest:
        db_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not db_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )
        if db_request.hospital_id != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this request"
            )
        return db_request

    @staticmethod
    def verify_request(
        db: Session, request_id: int, hospital_id: int, approve: bool, rejection_reason: Optional[str] = None
    ) -> BloodRequest:
        db_request = HospitalService.get_request_detail(db, request_id, hospital_id)
        new_status = "VERIFIED" if approve else "REJECTED"
        assert_transition(db_request.status, new_status)

        if approve and HospitalService.get_linked_blood_bank(db, hospital_id) is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No approved blood bank linked to this hospital yet"
            )

        db_request.status = new_status
        db.add(db_request)
        db.commit()
        db.refresh(db_request)

        if approve:
            message = "Your blood request has been verified by the hospital and forwarded to their blood bank."
        else:
            message = "Your blood request was rejected by the hospital."
            if rejection_reason:
                message += f" Reason: {rejection_reason}"

        NotificationService.create_notification(
            db=db,
            recipient_id=db_request.requester_id,
            recipient_type="user",
            title="Blood Request Update",
            message=message
        )

        return db_request

    @staticmethod
    def confirm_blood_received(db: Session, request_id: int, hospital_id: int) -> BloodRequest:
        db_request = HospitalService.get_request_detail(db, request_id, hospital_id)
        assert_transition(db_request.status, "BLOOD_RECEIVED")
        db_request.status = "BLOOD_RECEIVED"
        db.add(db_request)
        db.commit()
        db.refresh(db_request)

        NotificationService.create_notification(
            db=db,
            recipient_id=db_request.requester_id,
            recipient_type="user",
            title="Blood Received",
            message="The hospital has confirmed receipt of the requested blood."
        )

        fulfillment = db.query(RequestFulfillment).filter(RequestFulfillment.request_id == request_id).first()
        if fulfillment and fulfillment.assigned_blood_bank_id:
            NotificationService.create_notification(
                db=db,
                recipient_id=fulfillment.assigned_blood_bank_id,
                recipient_type="org",
                title="Blood Received by Hospital",
                message=f"The hospital has confirmed receipt of blood for request #{request_id}."
            )

        # Close the loop for everyone who actually gave: until now a donor was
        # thanked at collection and then never heard whether it helped.
        collected = db.query(CommunityResponse).filter(
            CommunityResponse.request_id == request_id,
            CommunityResponse.status == "BLOOD_COLLECTED"
        ).all()
        for response in collected:
            if response.donor_id:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=response.donor_id,
                    recipient_type="user",
                    title="Your Donation Reached the Patient",
                    message=(
                        f"The hospital has confirmed it received the blood you donated for "
                        f"{db_request.patient_name}. Thank you — this request is now complete."
                    )
                )
            elif response.ngo_id:
                NotificationService.create_notification(
                    db=db,
                    recipient_id=response.ngo_id,
                    recipient_type="org",
                    title="Donation Reached the Patient",
                    message=(
                        f"The hospital confirmed receipt of blood for request #{request_id}, "
                        "coordinated by your organization. Thank you."
                    )
                )

        return db_request

    @staticmethod
    def get_linked_blood_bank(db: Session, hospital_id: int) -> Optional[Organization]:
        # Retrieve the approved blood bank link for the hospital
        link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).first()
        if not link:
            return None
        return db.query(Organization).filter(Organization.id == link.blood_bank_id).first()

    @staticmethod
    def list_blood_bank_links(db: Session, hospital_id: int) -> List[HospitalBloodBankLink]:
        """Every link row this hospital owns, so the UI can tell apart
        'not requested', 'request pending', 'rejected' and 'linked'."""
        return db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id
        ).order_by(HospitalBloodBankLink.id.asc()).all()

    @staticmethod
    def request_blood_bank_link(db: Session, hospital_id: int, blood_bank_id: int) -> HospitalBloodBankLink:
        # Check if target blood bank exists and is actually a blood bank
        blood_bank = db.query(Organization).filter(
            Organization.id == blood_bank_id,
            Organization.org_type == "BLOOD_BANK"
        ).first()
        if not blood_bank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood bank not found"
            )

        # Business rule: one hospital serves through exactly one blood bank at a
        # time. Reject a request to a second bank while a link is live.
        active_link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).first()
        if active_link and active_link.blood_bank_id != blood_bank_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Hospital is already linked to a blood bank. Unlink first before linking to a new one."
            )

        # Check if link already exists
        existing_link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.blood_bank_id == blood_bank_id
        ).first()
        if existing_link:
            if existing_link.status in ("REJECTED", "UNLINKED"):
                # Allow re-requesting after a rejection or an unlink
                existing_link.status = "PENDING"
                db.add(existing_link)
                db.commit()
                db.refresh(existing_link)
                return existing_link
            return existing_link

        new_link = HospitalBloodBankLink(
            hospital_id=hospital_id,
            blood_bank_id=blood_bank_id,
            status="PENDING"
        )
        db.add(new_link)
        db.commit()
        db.refresh(new_link)
        return new_link

    @staticmethod
    def unlink_blood_bank(db: Session, hospital_id: int) -> HospitalBloodBankLink:
        """Drop the hospital's current blood bank association so it can link
        to a different one."""
        link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No linked blood bank to unlink"
            )

        # Refuse while the bank still owes this hospital blood, otherwise those
        # requests would be stranded with no bank able to act on them.
        in_flight = db.query(BloodRequest).filter(
            BloodRequest.hospital_id == hospital_id,
            BloodRequest.status.in_(NON_TERMINAL_STATUSES),
            BloodRequest.status != "PENDING"
        ).count()
        if in_flight:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot unlink while {in_flight} request(s) are still being fulfilled by this blood bank."
            )

        link.status = "UNLINKED"
        db.add(link)
        db.commit()
        db.refresh(link)

        NotificationService.create_notification(
            db=db,
            recipient_id=link.blood_bank_id,
            recipient_type="org",
            title="Hospital Unlinked",
            message="A linked hospital has ended its association with your blood bank."
        )
        return link

    @staticmethod
    def search_approved_blood_banks(db: Session, search_query: Optional[str] = None) -> List[Organization]:
        query = db.query(Organization).filter(
            Organization.org_type == "BLOOD_BANK",
            Organization.approval_status == "APPROVED"
        )
        if search_query:
            query = query.filter(Organization.org_name.ilike(f"%{search_query}%"))
        return query.all()
