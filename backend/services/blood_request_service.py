from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.models import BloodRequest
from backend.schemas.blood_request import BloodRequestCreate
from backend.services.request_status import assert_transition


class BloodRequestService:
    @staticmethod
    def create_request(db: Session, requester_id: int, request_in: BloodRequestCreate) -> BloodRequest:
        # hospital_id is required: every request must go through hospital
        # verification before it can ever reach a blood bank or donors.
        db_request = BloodRequest(
            requester_id=requester_id,
            patient_name=request_in.patient_name,
            blood_group_required=request_in.blood_group_required,
            units_required=request_in.units_required,
            hospital_id=request_in.hospital_id,
            priority=request_in.priority,
            emergency_reason=request_in.emergency_reason,
            status="PENDING"
        )
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def list_my_requests(db: Session, requester_id: int) -> List[BloodRequest]:
        return db.query(BloodRequest).filter(
            BloodRequest.requester_id == requester_id
        ).order_by(BloodRequest.created_at.desc()).all()

    @staticmethod
    def get_request_detail(db: Session, request_id: int, requester_id: int) -> BloodRequest:
        db_request = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
        if not db_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blood request not found"
            )
        if db_request.requester_id != requester_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this request"
            )
        return db_request

    @staticmethod
    def cancel_request(db: Session, request_id: int, requester_id: int) -> BloodRequest:
        db_request = BloodRequestService.get_request_detail(db, request_id, requester_id)
        if db_request.status == "DISPATCHED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot cancel request: Blood has already been dispatched by the blood bank and is in transit to the hospital."
            )
        if db_request.status == "READY_FOR_DISPATCH":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot cancel request: Blood units have already been secured/collected and prepared for dispatch."
            )
        if db_request.status == "BLOOD_RECEIVED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot cancel request: Blood has already been received by the hospital."
            )
        if db_request.status in ("CANCELLED", "REJECTED"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This request is already {db_request.status.lower()}."
            )

        assert_transition(db_request.status, "CANCELLED")

        db_request.status = "CANCELLED"
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return db_request
