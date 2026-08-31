from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.models import Notification, BloodRequest, RequestFulfillment


class NotificationService:
    @staticmethod
    def list_notifications(db: Session, recipient_id: int, recipient_type: str) -> List[Notification]:
        query = db.query(Notification)
        if recipient_type == "user":
            query = query.filter(Notification.recipient_user_id == recipient_id)
        else:
            query = query.filter(Notification.recipient_org_id == recipient_id)
        return query.order_by(Notification.created_at.desc()).all()

    @staticmethod
    def mark_read(db: Session, notification_id: int, recipient_id: int, recipient_type: str) -> Notification:
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )

        # Enforce recipient ownership checks
        if recipient_type == "user":
            if notification.recipient_user_id != recipient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to mark this notification as read"
                )
        else:
            if notification.recipient_org_id != recipient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to mark this notification as read"
                )

        notification.is_read = True
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_read(db: Session, recipient_id: int, recipient_type: str) -> None:
        query = db.query(Notification).filter(Notification.is_read == False)
        if recipient_type == "user":
            query = query.filter(Notification.recipient_user_id == recipient_id)
        else:
            query = query.filter(Notification.recipient_org_id == recipient_id)

        query.update({Notification.is_read: True}, synchronize_session=False)
        db.commit()

    @staticmethod
    def create_notification(db: Session, recipient_id: int, recipient_type: str, title: str, message: str) -> Notification:
        notification = Notification(
            title=title,
            message=message,
            is_read=False
        )
        if recipient_type == "user":
            notification.recipient_user_id = recipient_id
        else:
            notification.recipient_org_id = recipient_id

        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def notify_response_fanout(db: Session, request: BloodRequest, message: str) -> None:
        """Notify the assigned blood bank, hospital, and requester about a donor/NGO response."""
        fulfillment = db.query(RequestFulfillment).filter(
            RequestFulfillment.request_id == request.id
        ).first()

        if fulfillment and fulfillment.assigned_blood_bank_id:
            NotificationService.create_notification(
                db=db, recipient_id=fulfillment.assigned_blood_bank_id, recipient_type="org",
                title="Donor Response", message=message
            )
        if request.hospital_id:
            NotificationService.create_notification(
                db=db, recipient_id=request.hospital_id, recipient_type="org",
                title="Donor Response", message=message
            )
        NotificationService.create_notification(
            db=db, recipient_id=request.requester_id, recipient_type="user",
            title="Donor Response", message=message
        )
