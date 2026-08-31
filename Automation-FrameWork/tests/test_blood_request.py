import datetime
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.models import User, Organization, BloodRequest
from backend.core.security import hash_password
from backend.core.security import get_current_user
from types import SimpleNamespace
from backend.main import app


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def create_user_if_missing():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.id == 1).first()
        if existing:
            return existing
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


def ensure_hospital(email="br_hospital@example.com"):
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.email == email).first()
        if org:
            return org
        org = Organization(
            org_name="BR Hospital",
            org_type="HOSPITAL",
            poc_name="p",
            poc_contact="c",
            email=email,
            registration_number_hrf_id=email,
            address="addr",
            password_hash="x",
            approval_status="APPROVED",
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        return org
    finally:
        db.close()


def test_create_request_returns_created(api_client):
    create_user_if_missing()
    hospital = ensure_hospital()

    payload = {
        "patient_name": "John Doe",
        "blood_group_required": "A+",
        "units_required": 2,
        "hospital_id": hospital.id,
        "priority": "EMERGENCY",
        "emergency_reason": "Accident",
    }

    resp = api_client.post("/api/v1/blood-requests", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["patient_name"] == payload["patient_name"]
    assert data["status"] == "PENDING"


def test_create_request_requires_hospital(api_client):
    create_user_if_missing()
    payload = {
        "patient_name": "No Hospital",
        "blood_group_required": "A+",
        "units_required": 1,
        "priority": "URGENT",
    }
    resp = api_client.post("/api/v1/blood-requests", json=payload)
    assert resp.status_code == 422


def test_list_my_requests_returns_items(api_client):
    create_user_if_missing()
    hospital = ensure_hospital()
    # create two requests
    payload = {
        "patient_name": "A",
        "blood_group_required": "A+",
        "units_required": 1,
        "hospital_id": hospital.id,
        "priority": "PLANNED",
    }
    api_client.post("/api/v1/blood-requests", json=payload)
    payload["patient_name"] = "B"
    api_client.post("/api/v1/blood-requests", json=payload)

    resp = api_client.get("/api/v1/blood-requests/mine")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 2


def test_get_detail_forbidden(api_client):
    create_user_if_missing()
    hospital = ensure_hospital()
    # create a request as user 1
    payload = {
        "patient_name": "Private Patient",
        "blood_group_required": "O+",
        "units_required": 1,
        "hospital_id": hospital.id,
        "priority": "PLANNED",
    }
    resp = api_client.post("/api/v1/blood-requests", json=payload)
    assert resp.status_code == 201
    req_id = resp.json()["id"]

    # temporarily override current_user to simulate another user
    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=2, role="user")
    try:
        resp = api_client.get(f"/api/v1/blood-requests/{req_id}")
        assert resp.status_code == 403
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
        else:
            app.dependency_overrides.pop(get_current_user, None)


def test_cancel_request_returns_cancelled(api_client):
    create_user_if_missing()
    hospital = ensure_hospital()
    payload = {
        "patient_name": "To Cancel",
        "blood_group_required": "B+",
        "units_required": 1,
        "hospital_id": hospital.id,
        "priority": "URGENT",
    }
    resp = api_client.post("/api/v1/blood-requests", json=payload)
    assert resp.status_code == 201
    req_id = resp.json()["id"]

    resp = api_client.delete(f"/api/v1/blood-requests/{req_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "CANCELLED"


def test_cannot_cancel_already_dispatched_request(api_client):
    create_user_if_missing()
    # insert a request already committed to a blood bank directly into DB
    db = SessionLocal()
    try:
        br = BloodRequest(
            requester_id=1,
            patient_name="Dispatched Patient",
            blood_group_required="AB+",
            units_required=3,
            priority="URGENT",
            status="DISPATCHED",
        )
        db.add(br)
        db.commit()
        db.refresh(br)
        req_id = br.id
    finally:
        db.close()

    resp = api_client.delete(f"/api/v1/blood-requests/{req_id}")
    assert resp.status_code == 409


def test_create_request_without_authentication(api_client):
    hospital = ensure_hospital()
    original = app.dependency_overrides.pop(get_current_user, None)
    try:
        response = api_client.post(
            "/api/v1/blood-requests",
            json={
                "patient_name": "Unauthenticated",
                "blood_group_required": "A+",
                "units_required": 1,
                "hospital_id": hospital.id,
                "priority": "URGENT",
            },
        )
        assert response.status_code == 401
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original


import pytest


@pytest.mark.parametrize(
    "payload",
    [
        {
            "patient_name": "Missing Blood Group",
            "units_required": 1,
            "priority": "URGENT",
        },
        {
            "patient_name": "Invalid Blood Group",
            "blood_group_required": "X+",
            "units_required": 1,
            "priority": "URGENT",
        },
    ],
)
def test_create_request_validation_errors(api_client, payload):
    create_user_if_missing()
    hospital = ensure_hospital()
    payload = {**payload, "hospital_id": hospital.id}
    response = api_client.post("/api/v1/blood-requests", json=payload)
    assert response.status_code == 422


def test_list_my_requests_without_authentication(api_client):
    original = app.dependency_overrides.pop(get_current_user, None)
    try:
        response = api_client.get("/api/v1/blood-requests/mine")
        assert response.status_code == 401
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original


def test_get_nonexistent_request_returns_not_found(api_client):
    create_user_if_missing()
    response = api_client.get("/api/v1/blood-requests/999999")
    assert response.status_code == 404


def test_delete_nonexistent_request_returns_not_found(api_client):
    create_user_if_missing()
    response = api_client.delete("/api/v1/blood-requests/999999")
    assert response.status_code == 404
