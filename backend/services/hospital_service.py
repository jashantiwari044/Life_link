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


from backend.schemas.blood_request import BloodRequestBase, HospitalBloodRequestCreate
from backend.services.notification_service import NotificationService
from backend.services.request_status import assert_transition, NON_TERMINAL_STATUSES


class HospitalService:
    @staticmethod
    def raise_blood_request(db: Session, hospital_id: int, request_in: HospitalBloodRequestCreate) -> BloodRequest:
        # Determine requester user id (fallback to admin user if not provided so no DB FK issue)
        requester_id = request_in.requester_id
        if requester_id:
            user = db.query(User).filter(User.id == requester_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Patient (requester) user not found"
                )
        else:
            admin_user = db.query(User).filter(User.role == "admin").first()
            requester_id = admin_user.id if admin_user else 1


        hosp = db.query(Organization).filter(Organization.id == hospital_id).first()
        hosp_name = hosp.org_name if hosp else "Hospital"
        patient_name = request_in.patient_name or f"{hosp_name} Requisition"

        db_request = BloodRequest(
            requester_id=requester_id,
            patient_name=patient_name,
            blood_group_required=request_in.blood_group_required,
            units_required=request_in.units_required,
            hospital_id=hospital_id,
            priority=request_in.priority,
            emergency_reason=request_in.emergency_reason,
            status="PENDING"
        )
        db.add(db_request)
        db.flush()

        if request_in.blood_bank_id:
            target_bank = db.query(Organization).filter(
                Organization.id == request_in.blood_bank_id,
                Organization.org_type == "BLOOD_BANK"
            ).first()
            if not target_bank:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target blood bank not found"
                )
            fulfillment = RequestFulfillment(
                request_id=db_request.id,
                assigned_blood_bank_id=request_in.blood_bank_id,
                fulfillment_type="DIRECT"
            )
            db.add(fulfillment)

            hosp = db.query(Organization).filter(Organization.id == hospital_id).first()
            hosp_name = hosp.org_name if hosp else "A hospital"
            NotificationService.create_notification(
                db=db,
                recipient_id=request_in.blood_bank_id,
                recipient_type="org",
                title="New Blood Request Received",
                message=f"{hosp_name} submitted a blood request for {db_request.units_required} unit(s) of {db_request.blood_group_required} ({db_request.priority})."
            )

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
        # Retrieve the first approved blood bank link for backward compatibility
        link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).first()
        if not link:
            return None
        return db.query(Organization).filter(Organization.id == link.blood_bank_id).first()

    @staticmethod
    def get_linked_blood_banks(db: Session, hospital_id: int) -> List[Organization]:
        """Return all approved blood banks linked to this hospital."""
        links = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).all()
        bank_ids = [l.blood_bank_id for l in links]
        if not bank_ids:
            return []
        return db.query(Organization).filter(Organization.id.in_(bank_ids)).all()

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

        # Check if link already exists
        existing_link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.blood_bank_id == blood_bank_id
        ).first()
        if existing_link:
            if existing_link.status in ("REJECTED", "UNLINKED"):
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

        hosp = db.query(Organization).filter(Organization.id == hospital_id).first()
        hosp_name = hosp.org_name if hosp else "A hospital"
        NotificationService.create_notification(
            db=db,
            recipient_id=blood_bank_id,
            recipient_type="org",
            title="Hospital Link Request",
            message=f"{hosp_name} has requested to connect with your blood bank."
        )
        return new_link

    @staticmethod
    def unlink_blood_bank(db: Session, hospital_id: int, blood_bank_id: Optional[int] = None) -> HospitalBloodBankLink:
        """Drop a hospital's association with a specific blood bank."""
        query = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == hospital_id,
            HospitalBloodBankLink.status == "APPROVED"
        )
        if blood_bank_id:
            query = query.filter(HospitalBloodBankLink.blood_bank_id == blood_bank_id)
        link = query.first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No linked blood bank to unlink"
            )

        target_bank_id = link.blood_bank_id
        in_flight = db.query(BloodRequest).outerjoin(
            RequestFulfillment, BloodRequest.id == RequestFulfillment.request_id
        ).filter(
            BloodRequest.hospital_id == hospital_id,
            BloodRequest.status.in_(NON_TERMINAL_STATUSES),
            BloodRequest.status != "PENDING",
            or_(
                RequestFulfillment.assigned_blood_bank_id == target_bank_id,
                RequestFulfillment.assigned_blood_bank_id.is_(None)
            )
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
            title="Hospital Disconnected",
            message="A hospital has ended its association with your blood bank."
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
