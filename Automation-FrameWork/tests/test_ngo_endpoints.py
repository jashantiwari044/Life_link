import datetime
from types import SimpleNamespace
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.models import Organization, DonationCamp, BloodRequest, CommunityResponse
from backend.core.security import get_current_user
from backend.main import app


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def _create_ngo(db, email="ngo1@example.com", approved=True):
    org = db.query(Organization).filter(Organization.email == email).first()
    if org:
        return org
    org = Organization(org_name=email.split("@")[0], org_type="NGO", poc_name="p", poc_contact="c",
                       email=email, registration_number_hrf_id=email, address="a", password_hash="x",
                       approval_status="APPROVED" if approved else "PENDING")
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def test_create_and_list_camp(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.create@example.com")
        # create camp
        camp = DonationCamp(ngo_id=ngo.id, title="Camp A", venue="Hall", date_time=datetime.datetime.now(), contact_info="111")
        db.add(camp)
        db.commit()
        db.refresh(camp)
        camp_id = camp.id
        ngo_id = ngo.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        r = api_client.get("/api/v1/ngo/camps")
        assert r.status_code == 200
        assert any(c["id"] == camp_id for c in r.json())
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_get_camp_detail_and_delete(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.detail@example.com")
        other_ngo = _create_ngo(db, "ngo.other@example.com")
        camp = DonationCamp(ngo_id=ngo.id, title="Camp B", venue="Park", date_time=datetime.datetime.now(), contact_info="222")
        db.add(camp)
        db.commit()
        db.refresh(camp)
        camp_id = camp.id
        ngo_id = ngo.id
        other_id = other_ngo.id
    finally:
        db.close()

    # unauthorized deletion by other NGO
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=other_id, role="ngo")
    try:
        r = api_client.delete(f"/api/v1/ngo/camps/{camp_id}")
        assert r.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # proper owner can delete
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        r = api_client.delete(f"/api/v1/ngo/camps/{camp_id}")
        assert r.status_code == 200
        assert r.json()["id"] == camp_id
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_list_active_requests_and_respond(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.respond@example.com")
        # create open blood request
        br = BloodRequest(requester_id=1, patient_name="OpenPatient", blood_group_required="A+", units_required=1,
                          hospital_id=None, priority="PLANNED", status="OPEN")
        db.add(br)
        db.commit()
        db.refresh(br)
        br_id = br.id
        ngo_id = ngo.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        r = api_client.get("/api/v1/ngo/active-requests")
        assert r.status_code == 200
        assert any(rq["id"] == br_id for rq in r.json())

        resp = api_client.post(f"/api/v1/ngo/active-requests/{br_id}/respond")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("request_id") == br_id
        assert data.get("responder_type") == "NGO"

        # second response should return same existing record (idempotent)
        resp2 = api_client.post(f"/api/v1/ngo/active-requests/{br_id}/respond")
        assert resp2.status_code == 200
        assert resp2.json().get("id") == data.get("id")
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_list_camps_without_authentication(api_client):
    original = app.dependency_overrides.pop(get_current_user, None)
    try:
        resp = api_client.get("/api/v1/ngo/camps")
        assert resp.status_code == 401
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original


def test_publish_camp_and_get_empty_active_requests(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.publish@example.com")
        ngo_id = ngo.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        camp_payload = {
            "title": "Blood Drive 2026",
            "venue": "Community Hall",
            "date_time": datetime.datetime(2026, 9, 1, 10, 0, 0).isoformat(),
            "contact_info": "1234567890",
            "latitude": 12.9716,
            "longitude": 77.5946,
        }
        camp_resp = api_client.post("/api/v1/ngo/camps", json=camp_payload)
        assert camp_resp.status_code == 200
        assert camp_resp.json()["title"] == "Blood Drive 2026"

        active_resp = api_client.get("/api/v1/ngo/active-requests")
        assert active_resp.status_code == 200
        assert isinstance(active_resp.json(), list)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_get_nonexistent_camp_returns_not_found(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.notfound@example.com")
        ngo_id = ngo.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        resp = api_client.get("/api/v1/ngo/camps/999999")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_delete_nonexistent_camp_returns_not_found(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.delete@example.com")
        ngo_id = ngo.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        resp = api_client.delete("/api/v1/ngo/camps/999999")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_respond_to_nonexistent_request_returns_not_found(api_client):
    db = SessionLocal()
    try:
        ngo = _create_ngo(db, "ngo.respond404@example.com")
        ngo_id = ngo.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        resp = api_client.post("/api/v1/ngo/active-requests/999999/respond")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
