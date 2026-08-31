import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from types import SimpleNamespace

from backend.core.models import User
from backend.core.security import hash_password, get_current_user
from backend.main import app
from backend.services.notification_service import NotificationService
from backend.core.models import Notification


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def ensure_user():
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == 1).first()
        if u:
            return u
        u = User(
            id=1,
            full_name="Test User",
            dob=datetime.date(1990, 1, 1),
            blood_group="O+",
            phone_number="1234567890",
            email="test_user@example.com",
            address="123 Test St",
            password_hash=hash_password("password"),
            aadhaar_number_redacted="xxxx",
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u
    finally:
        db.close()


def test_list_notifications(api_client):
    ensure_user()
    db = SessionLocal()
    try:
        NotificationService.create_notification(db=db, recipient_id=1, recipient_type="user", title="T1", message="M1")
        NotificationService.create_notification(db=db, recipient_id=1, recipient_type="user", title="T2", message="M2")
    finally:
        db.close()

    resp = api_client.get("/api/v1/notifications")
    print(resp.json())
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert any(i["title"] == "T1" for i in items)


def test_mark_notification_as_read(api_client):
    ensure_user()
    db = SessionLocal()
    try:
        n = NotificationService.create_notification(db=db, recipient_id=1, recipient_type="user", title="ToRead", message="m")
        nid = n.id
    finally:
        db.close()

    resp = api_client.patch(f"/api/v1/notifications/{nid}/read")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_read"] is True


def test_mark_all_notifications_as_read(api_client):
    ensure_user()
    db = SessionLocal()
    try:
        NotificationService.create_notification(db=db, recipient_id=1, recipient_type="user", title="A", message="a")
        NotificationService.create_notification(db=db, recipient_id=1, recipient_type="user", title="B", message="b")
    finally:
        db.close()

    resp = api_client.patch("/api/v1/notifications/read-all")
    assert resp.status_code == 200
    assert resp.json()["message"] == "All notifications marked as read"

    # verify all are read
    db = SessionLocal()
    try:
        unread = db.query(Notification).filter(Notification.recipient_user_id == 1, Notification.is_read == False).count()
        assert unread == 0
    finally:
        db.close()


def test_forbidden_mark_read(api_client):
    ensure_user()
    db = SessionLocal()
    try:
        # create notification for user id 2
        n = NotificationService.create_notification(db=db, recipient_id=2, recipient_type="user", title="Other", message="x")
        nid = n.id
    finally:
        db.close()

    resp = api_client.patch(f"/api/v1/notifications/{nid}/read")
    assert resp.status_code == 403


def test_mark_notification_not_found(api_client):
    ensure_user()
    resp = api_client.patch("/api/v1/notifications/999999/read")
    assert resp.status_code == 404


def test_notifications_list_for_org_recipient(api_client):
    db = SessionLocal()
    try:
        org = db.query(User).filter(User.id == 1).first()
        if org is None:
            ensure_user()
        NotificationService.create_notification(
            db=db,
            recipient_id=77,
            recipient_type="org",
            title="OrgNotice",
            message="Org message",
        )
    finally:
        db.close()

    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=77, role="hospital")
    try:
        resp = api_client.get("/api/v1/notifications")
        print(resp.json())
        assert resp.status_code == 200
        items = resp.json()
        assert any(item["title"] == "OrgNotice" for item in items)
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
        else:
            app.dependency_overrides.pop(get_current_user, None)


def test_mark_notification_as_read_for_other_org_forbidden(api_client):
    ensure_user()
    db = SessionLocal()
    try:
        n = NotificationService.create_notification(
            db=db,
            recipient_id=88,
            recipient_type="org",
            title="OtherOrg",
            message="x",
        )
        nid = n.id
    finally:
        db.close()

    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=99, role="hospital")
    try:
        resp = api_client.patch(f"/api/v1/notifications/{nid}/read")
        assert resp.status_code == 403
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
        else:
            app.dependency_overrides.pop(get_current_user, None)


def test_mark_all_notifications_without_authentication(api_client):
    original = app.dependency_overrides.pop(get_current_user, None)
    try:
        resp = api_client.patch("/api/v1/notifications/read-all")
        print(resp.json())
        assert resp.status_code == 401
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
