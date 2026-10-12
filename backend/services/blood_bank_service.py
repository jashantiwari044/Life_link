import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from backend.core.models import (
    BloodRequest, HospitalBloodBankLink, RequestFulfillment,
    CommunityResponse, User, Organization, BloodInventory, ShortageAlert
)
from backend.schemas.shortage_alert import ShortageAlertCreate
from backend.services.notification_service import NotificationService
from backend.services.request_status import assert_transition, BLOOD_GROUPS, NON_TERMINAL_STATUSES


class BloodBankService:
    @staticmethod
    def get_request_detail(db: Session, request_id: int, blood_bank_id: int) -> BloodRequest:
        """Fetch a single request for the tracking page.

        Does NOT filter by status — this is the fix for the tracking page
        returning 'not found' when a request moves past READY_FOR_DISPATCH.
        Still enforces the hospital-blood-bank link so a bank can't read
        requests from hospitals it isn't linked to.
        """
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )
        BloodBankService._authorize_linked_request(db, request, blood_bank_id)
        return request

    @staticmethod
    def list_incoming_requests(
        db: Session,
        blood_bank_id: int,
        priority_filter: Optional[str] = None,
        status_filter: Optional[str] = None,
        include_completed: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[BloodRequest]:
        # 1. Fetch all approved linked hospital IDs
        links = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.blood_bank_id == blood_bank_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).all()
        hospital_ids = [link.hospital_id for link in links]

        conditions = [RequestFulfillment.assigned_blood_bank_id == blood_bank_id]
        if hospital_ids:
            conditions.append(
                and_(
                    BloodRequest.hospital_id.in_(hospital_ids),
                    RequestFulfillment.assigned_blood_bank_id.is_(None)
                )
            )

        query = db.query(BloodRequest).outerjoin(
            RequestFulfillment, BloodRequest.id == RequestFulfillment.request_id
        ).filter(or_(*conditions))

        if status_filter:
            query = query.filter(BloodRequest.status == status_filter)
        elif not include_completed:
            query = query.filter(BloodRequest.status.in_(NON_TERMINAL_STATUSES))

        if priority_filter:
            query = query.filter(BloodRequest.priority == priority_filter)
        return query.order_by(BloodRequest.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def _get_or_create_inventory_row(db: Session, blood_bank_id: int, blood_group: str) -> BloodInventory:
        row = db.query(BloodInventory).filter(
            BloodInventory.blood_bank_id == blood_bank_id,
            BloodInventory.blood_group == blood_group
        ).first()
        if row:
            return row

        # Read-then-insert races whenever two requests hit a blood bank whose
        # rows do not exist yet (the client firing the same load twice is enough).
        # The unique constraint is the arbiter: if we lose, re-read the winner's row.
        row = BloodInventory(blood_bank_id=blood_bank_id, blood_group=blood_group, units_available=0)
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            row = db.query(BloodInventory).filter(
                BloodInventory.blood_bank_id == blood_bank_id,
                BloodInventory.blood_group == blood_group
            ).first()
            if row is None:
                raise
            return row
        db.refresh(row)
        return row

    @staticmethod
    def get_inventory(db: Session, blood_bank_id: int) -> List[BloodInventory]:
        existing = db.query(BloodInventory).filter(
            BloodInventory.blood_bank_id == blood_bank_id
        ).all()
        missing = set(BLOOD_GROUPS) - {row.blood_group for row in existing}
        if missing:
            # One transaction for the whole backfill rather than eight, and the
            # same lose-the-race-then-re-read guard as above.
            db.add_all([
                BloodInventory(blood_bank_id=blood_bank_id, blood_group=group, units_available=0)
                for group in sorted(missing)
            ])
            try:
                db.commit()
            except IntegrityError:
                db.rollback()

        return db.query(BloodInventory).filter(
            BloodInventory.blood_bank_id == blood_bank_id
        ).order_by(BloodInventory.blood_group.asc()).all()

    @staticmethod
    def set_inventory(db: Session, blood_bank_id: int, blood_group: str, units_available: int) -> BloodInventory:
        if blood_group not in BLOOD_GROUPS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid blood group '{blood_group}'"
            )
        row = BloodBankService._get_or_create_inventory_row(db, blood_bank_id, blood_group)
        row.units_available = units_available
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    @staticmethod
    def set_inventory_batch(db: Session, blood_bank_id: int, items: list) -> List[BloodInventory]:
        results = []
        for item in items:
            bg = item.blood_group if hasattr(item, "blood_group") else item.get("blood_group")
            units = item.units_available if hasattr(item, "units_available") else item.get("units_available")
            if bg not in BLOOD_GROUPS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid blood group '{bg}'"
                )
            row = BloodBankService._get_or_create_inventory_row(db, blood_bank_id, bg)
            row.units_available = units
            db.add(row)
            results.append(row)
        db.commit()
        for row in results:
            db.refresh(row)
        return results

    @staticmethod
    def _authorize_linked_request(db: Session, request: BloodRequest, blood_bank_id: int) -> None:
        if request.fulfillment and request.fulfillment.assigned_blood_bank_id == blood_bank_id:
            return
        if not request.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Request has no associated hospital"
            )
        link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.hospital_id == request.hospital_id,
            HospitalBloodBankLink.blood_bank_id == blood_bank_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Hospital is not linked to this blood bank"
            )

    @staticmethod
    def process_fulfillment(db: Session, request_id: int, blood_bank_id: int) -> BloodRequest:
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )

        BloodBankService._authorize_linked_request(db, request, blood_bank_id)

        inventory_row = BloodBankService._get_or_create_inventory_row(
            db, blood_bank_id, request.blood_group_required
        )

        fulfillment = db.query(RequestFulfillment).filter(RequestFulfillment.request_id == request_id).first()
        if not fulfillment:
            fulfillment = RequestFulfillment(request_id=request_id)
        fulfillment.assigned_blood_bank_id = blood_bank_id

        was_open = request.status == "OPEN"

        if inventory_row.units_available >= request.units_required:
            assert_transition(request.status, "READY_FOR_DISPATCH")
            inventory_row.units_available -= request.units_required
            fulfillment.fulfillment_type = "DIRECT"
            request.status = "READY_FOR_DISPATCH"
            notify_message = f"Blood request #{request.id} fulfilled from blood bank stock. Preparing for dispatch."
        elif was_open:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Still short on {request.blood_group_required}: "
                    f"{inventory_row.units_available} unit(s) in stock, {request.units_required} needed. "
                    "The request stays open to donors and NGOs."
                )
            )
        else:
            assert_transition(request.status, "OPEN")
            fulfillment.fulfillment_type = "COMMUNITY"
            request.status = "OPEN"
            notify_message = "Blood bank stock insufficient — request published for community and NGO mobilization."


        db.add(inventory_row)
        db.add(fulfillment)
        db.add(request)

        db.commit()
        db.refresh(request)

        NotificationService.create_notification(
            db=db, recipient_id=request.requester_id, recipient_type="user",
            title="Blood Request Update", message=notify_message
        )
        if request.hospital_id:
            NotificationService.create_notification(
                db=db, recipient_id=request.hospital_id, recipient_type="org",
                title="Blood Request Update", message=notify_message
            )

        # Stock covered a request that had already been published — for example
        # after a walk-in donor gave blood off the back of a shared link. Close
        # the appeal so nobody makes a trip that is no longer needed.
        if was_open and request.status == "READY_FOR_DISPATCH":
            BloodBankService._stand_down_responders(db, request)

        return request

    @staticmethod
    def put_on_hold(db: Session, request_id: int, blood_bank_id: int) -> BloodRequest:
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )
        BloodBankService._authorize_linked_request(db, request, blood_bank_id)
        assert_transition(request.status, "ON_HOLD")
        request.status = "ON_HOLD"
        db.add(request)
        db.commit()
        db.refresh(request)
        if request.hospital_id:
            NotificationService.create_notification(
                db=db,
                recipient_id=request.hospital_id,
                recipient_type="org",
                title="Blood Requisition Put On Hold",
                message=f"Blood bank placed requisition #{request.id} ({request.blood_group_required}) on hold due to insufficient inventory."
            )
        return request

    @staticmethod
    def _stand_down_responders(db: Session, request: BloodRequest) -> None:
        """Release volunteers who committed to a request that no longer needs them."""
        pending = db.query(CommunityResponse).filter(
            CommunityResponse.request_id == request.id,
            CommunityResponse.status == "ACCEPTED"
        ).all()
        for response in pending:
            response.status = "NOT_NEEDED"
            db.add(response)
            message = (
                f"Good news — the blood for {request.patient_name} has been sourced from blood bank "
                "stock, so you no longer need to come in. Thank you for stepping up."
            )
            if response.donor_id:
                NotificationService.create_notification(
                    db=db, recipient_id=response.donor_id, recipient_type="user",
                    title="Donation No Longer Needed", message=message
                )
            elif response.ngo_id:
                NotificationService.create_notification(
                    db=db, recipient_id=response.ngo_id, recipient_type="org",
                    title="Donation No Longer Needed", message=message
                )
        if pending:
            db.commit()

    @staticmethod
    def verify_donor_blood(db: Session, community_response_id: int, blood_bank_id: int) -> CommunityResponse:
        # Find community response
        response = db.query(CommunityResponse).filter(CommunityResponse.id == community_response_id).first()
        if not response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Community response not found"
            )

        request = db.query(BloodRequest).filter(BloodRequest.id == response.request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )

        # Check authorization: either assigned in fulfillment, or request's hospital is linked to this blood bank
        fulfillment = db.query(RequestFulfillment).filter(
            RequestFulfillment.request_id == response.request_id
        ).first()

        is_assigned = fulfillment and fulfillment.assigned_blood_bank_id == blood_bank_id
        if not is_assigned:
            link = db.query(HospitalBloodBankLink).filter(
                HospitalBloodBankLink.hospital_id == request.hospital_id,
                HospitalBloodBankLink.blood_bank_id == blood_bank_id,
                HospitalBloodBankLink.status == "APPROVED"
            ).first() if request.hospital_id else None

            if not link:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This response's request is not assigned to your blood bank"
                )

            if not fulfillment:
                fulfillment = RequestFulfillment(
                    request_id=request.id,
                    assigned_blood_bank_id=blood_bank_id,
                    fulfillment_type="COMMUNITY"
                )
                db.add(fulfillment)
            else:
                fulfillment.assigned_blood_bank_id = blood_bank_id
                db.add(fulfillment)

        assert_transition(request.status, "READY_FOR_DISPATCH")

        # Confirm blood collected
        response.status = "BLOOD_COLLECTED"
        db.add(response)

        # If responder is a citizen donor, log their last donation date
        if response.donor_id:
            donor = db.query(User).filter(User.id == response.donor_id).first()
            if donor:
                donor.last_donation_date = datetime.date.today()
                db.add(donor)

        request.status = "READY_FOR_DISPATCH"
        db.add(request)

        db.commit()
        db.refresh(response)

        NotificationService.create_notification(
            db=db, recipient_id=request.requester_id, recipient_type="user",
            title="Blood Secured", message="A donation has been verified and collected. Preparing for dispatch to the hospital."
        )
        if request.hospital_id:
            NotificationService.create_notification(
                db=db, recipient_id=request.hospital_id, recipient_type="org",
                title="Blood Secured", message=f"Blood for request #{request.id} has been collected and verified. Preparing for dispatch."
            )
        if response.donor_id:
            NotificationService.create_notification(
                db=db, recipient_id=response.donor_id, recipient_type="user",
                title="Thank You for Donating", message="Your blood donation has been verified and collected. Thank you for saving a life."
            )
        elif response.ngo_id:
            NotificationService.create_notification(
                db=db, recipient_id=response.ngo_id, recipient_type="org",
                title="Donation Verified", message="The donation coordinated by your organization has been verified and collected."
            )

        return response

    @staticmethod
    def mark_dispatched(db: Session, request_id: int, blood_bank_id: int) -> BloodRequest:
        request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )

        fulfillment = db.query(RequestFulfillment).filter(RequestFulfillment.request_id == request_id).first()
        if not fulfillment or fulfillment.assigned_blood_bank_id != blood_bank_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This request is not assigned to your blood bank"
            )

        assert_transition(request.status, "DISPATCHED")
        request.status = "DISPATCHED"
        db.add(request)
        db.commit()
        db.refresh(request)

        NotificationService.create_notification(
            db=db, recipient_id=request.requester_id, recipient_type="user",
            title="Blood Dispatched", message="Blood is on its way to the hospital."
        )
        if request.hospital_id:
            NotificationService.create_notification(
                db=db, recipient_id=request.hospital_id, recipient_type="org",
                title="Blood Dispatched", message=f"Blood for request #{request.id} has been dispatched to your hospital."
            )

        return request

    @staticmethod
    def list_pending_link_requests(db: Session, blood_bank_id: int) -> List[HospitalBloodBankLink]:
        return db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.blood_bank_id == blood_bank_id,
            HospitalBloodBankLink.status == "PENDING"
        ).order_by(HospitalBloodBankLink.updated_at.desc()).all()

    @staticmethod
    def approve_reject_link(db: Session, link_id: int, blood_bank_id: int, approve: bool) -> HospitalBloodBankLink:
        link = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.id == link_id,
            HospitalBloodBankLink.blood_bank_id == blood_bank_id
        ).first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Link request not found"
            )

        link.status = "APPROVED" if approve else "REJECTED"
        db.add(link)
        db.commit()
        db.refresh(link)

        bank = db.query(Organization).filter(Organization.id == blood_bank_id).first()
        bank_name = bank.org_name if bank else "The blood bank"
        NotificationService.create_notification(
            db=db,
            recipient_id=link.hospital_id,
            recipient_type="org",
            title="Blood Bank Link Update",
            message=(
                f"{bank_name} approved your link request. You can now forward verified requests to them."
                if approve
                else f"{bank_name} rejected your link request."
            )
        )
        return link

    @staticmethod
    def list_linked_hospitals(db: Session, blood_bank_id: int) -> List[Organization]:
        links = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.blood_bank_id == blood_bank_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).all()
        hospital_ids = [link.hospital_id for link in links]
        if not hospital_ids:
            return []
        return db.query(Organization).filter(Organization.id.in_(hospital_ids)).all()

    @staticmethod
    def list_community_responses(
        db: Session, blood_bank_id: int, status_filter: Optional[str] = None
    ) -> List[CommunityResponse]:
        """Donor and NGO responses on requests assigned to this blood bank."""
        links = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.blood_bank_id == blood_bank_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).all()
        linked_hospital_ids = [link.hospital_id for link in links]

        query = db.query(CommunityResponse).join(
            BloodRequest, CommunityResponse.request_id == BloodRequest.id
        ).outerjoin(
            RequestFulfillment, BloodRequest.id == RequestFulfillment.request_id
        ).filter(
            or_(
                RequestFulfillment.assigned_blood_bank_id == blood_bank_id,
                BloodRequest.hospital_id.in_(linked_hospital_ids) if linked_hospital_ids else False
            )
        )
        if status_filter:
            query = query.filter(CommunityResponse.status == status_filter)
        return query.order_by(CommunityResponse.timestamp.desc()).all()

    @staticmethod
    def list_donation_logs(db: Session, blood_bank_id: int) -> List[CommunityResponse]:
        """Return all donation collections recorded by this blood bank."""
        links = db.query(HospitalBloodBankLink).filter(
            HospitalBloodBankLink.blood_bank_id == blood_bank_id,
            HospitalBloodBankLink.status == "APPROVED"
        ).all()
        linked_hospital_ids = [link.hospital_id for link in links]

        return db.query(CommunityResponse).join(
            BloodRequest, CommunityResponse.request_id == BloodRequest.id
        ).outerjoin(
            RequestFulfillment, BloodRequest.id == RequestFulfillment.request_id
        ).filter(
            CommunityResponse.status == "BLOOD_COLLECTED",
            or_(
                RequestFulfillment.assigned_blood_bank_id == blood_bank_id,
                BloodRequest.hospital_id.in_(linked_hospital_ids) if linked_hospital_ids else False
            )
        ).order_by(CommunityResponse.timestamp.desc()).all()

    @staticmethod
    def create_shortage_alert(
        db: Session, blood_bank_id: int, alert_in: ShortageAlertCreate
    ) -> ShortageAlert:
        urgency_map = {
            "EMERGENCY": "CRITICAL",
            "URGENT": "HIGH",
            "PLANNED": "MEDIUM",
        }
        canonical_urgency = urgency_map.get(alert_in.urgency, alert_in.urgency)

        alert = ShortageAlert(
            blood_bank_id=blood_bank_id,
            blood_group=alert_in.blood_group,
            units_needed=alert_in.units_needed,
            urgency=canonical_urgency,
            message=alert_in.message,
            status="ACTIVE"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        bank = db.query(Organization).filter(Organization.id == blood_bank_id).first()
        bank_name = bank.org_name if bank else "Blood Bank"

        # Broadcast notification to all approved NGOs
        ngos = db.query(Organization).filter(
            Organization.org_type == "NGO",
            Organization.approval_status == "APPROVED"
        ).all()
        for ngo in ngos:
            NotificationService.create_notification(
                db=db,
                recipient_id=ngo.id,
                recipient_type="org",
                title="Urgent Blood Drive Request",
                message=(
                    f"{bank_name} reported an urgent shortage of {alert.blood_group} blood ({alert.units_needed} units). "
                    f"Urgency: {alert.urgency}. Note: {alert.message}. Please schedule a blood donation drive."
                )
            )

        return alert

    @staticmethod
    def list_shortage_alerts(db: Session, blood_bank_id: int) -> List[ShortageAlert]:
        return db.query(ShortageAlert).filter(
            ShortageAlert.blood_bank_id == blood_bank_id
        ).order_by(ShortageAlert.created_at.desc()).all()


