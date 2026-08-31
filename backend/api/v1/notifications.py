from typing import List, Union
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core.db import get_db
from backend.core.security import get_current_user
from backend.core.models import User, Organization
from backend.schemas.notification import NotificationResponse
from backend.services.notification_service import NotificationService

router = APIRouter()


def get_recipient_info(current_user: Union[User, Organization]):
    # Determine type and ID for notification routing
    role = getattr(current_user, "role", "user")
    if role in ("user", "admin"):
        return current_user.id, "user"
    else:
        return current_user.id, "org"


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    current_user: Union[User, Organization] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all notifications for the authenticated user/organization.
    """
    recipient_id, recipient_type = get_recipient_info(current_user)
    return NotificationService.list_notifications(db=db, recipient_id=recipient_id, recipient_type=recipient_type)


@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    id: int,
    current_user: Union[User, Organization] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a single notification as read. Enforces recipient ownership.
    """
    recipient_id, recipient_type = get_recipient_info(current_user)
    return NotificationService.mark_read(
        db=db,
        notification_id=id,
        recipient_id=recipient_id,
        recipient_type=recipient_type
    )


@router.patch("/read-all")
def mark_all_notifications_as_read(
    current_user: Union[User, Organization] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications for the authenticated recipient as read.
    """
    recipient_id, recipient_type = get_recipient_info(current_user)
    NotificationService.mark_all_read(db=db, recipient_id=recipient_id, recipient_type=recipient_type)
    return {"message": "All notifications marked as read"}
