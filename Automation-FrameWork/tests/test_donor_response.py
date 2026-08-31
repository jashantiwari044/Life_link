import datetime
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.models import User, BloodRequest
from backend.core.security import hash_password, get_current_user
from backend.main import app


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def _create_donor(db, email, donor_mode=True, last_donation_date=None):
    u = db.query(User).filter(User.email == email).first()
    if u:
        return u
    u = User(
        full_name="Donor",
        dob=datetime.date(1990, 1, 1),
        blood_group="O+",
        phone_number="9990000000",
        email=email,
        address="a",
        password_hash=hash_password("pwd"),
        aadhaar_number_redacted="xx",
        donor_mode_enabled=donor_mode,
        last_donation_date=last_donation_date,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _create_open_request(db, patient_name="OpenPatient"):
    br = BloodRequest(
        requester_id=1, patient_name=patient_name, blood_group_required="O+", units_required=1,
        hospital_id=None, priority="URGENT", status="OPEN",
    )
    db.add(br)
    db.commit()
    db.refresh(br)
    return br


def _override_as_donor(donor_id):
    # The published-requests endpoint reads donor_mode_enabled/last_donation_date
    # straight off the injected current_user, so (unlike other overrides in this
    # suite) it needs a real User row, not a bare SimpleNamespace.
    def _load():
        db = SessionLocal()
        try:
            return db.query(User).filter(User.id == donor_id).first()
        finally:
            db.close()
    return _load


def test_published_requests_shows_eligibility_flag(api_client):
    db = SessionLocal()
    try:
        donor = _create_donor(db, "eligible_donor@example.com", donor_mode=True)
        _create_open_request(db, "PubA")
        donor_id = donor.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = _override_as_donor(donor_id)
    try:
        resp = api_client.get("/api/v1/users/published-requests")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert all(item["is_eligible_now"] is True for item in data)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_published_requests_ineligible_when_donor_mode_off(api_client):
    db = SessionLocal()
    try:
        donor = _create_donor(db, "off_donor@example.com", donor_mode=False)
        _create_open_request(db, "PubB")
        donor_id = donor.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = _override_as_donor(donor_id)
    try:
        resp = api_client.get("/api/v1/users/published-requests")
        assert resp.status_code == 200
        data = resp.json()
        assert all(item["is_eligible_now"] is False for item in data)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_respond_to_request_success(api_client):
    db = SessionLocal()
    try:
        donor = _create_donor(db, "responder@example.com", donor_mode=True)
        br = _create_open_request(db, "RespondMe")
        donor_id = donor.id
        br_id = br.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=donor_id, role="user")
    try:
        resp = api_client.post(f"/api/v1/users/requests/{br_id}/respond")
        assert resp.status_code == 200
        data = resp.json()
        assert data["responder_type"] == "DONOR"
        assert data["donor_id"] == donor_id
        assert data["status"] == "ACCEPTED"

        # idempotent: second response returns the same record
        resp2 = api_client.post(f"/api/v1/users/requests/{br_id}/respond")
        assert resp2.status_code == 200
        assert resp2.json()["id"] == data["id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_respond_to_request_blocked_when_ineligible(api_client):
    db = SessionLocal()
    try:
        donor = _create_donor(db, "blocked_donor@example.com", donor_mode=False)
        br = _create_open_request(db, "Blocked")
        donor_id = donor.id
        br_id = br.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=donor_id, role="user")
    try:
        resp = api_client.post(f"/api/v1/users/requests/{br_id}/respond")
        assert resp.status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_respond_to_request_blocked_within_cooldown(api_client):
    db = SessionLocal()
    try:
        recent = datetime.date.today() - datetime.timedelta(days=10)
        donor = _create_donor(db, "recent_donor@example.com", donor_mode=True, last_donation_date=recent)
        br = _create_open_request(db, "TooSoon")
        donor_id = donor.id
        br_id = br.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=donor_id, role="user")
    try:
        resp = api_client.post(f"/api/v1/users/requests/{br_id}/respond")
        assert resp.status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_respond_to_nonexistent_request_returns_not_found(api_client):
    db = SessionLocal()
    try:
        donor = _create_donor(db, "notfound_donor@example.com", donor_mode=True)
        donor_id = donor.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=donor_id, role="user")
    try:
        resp = api_client.post("/api/v1/users/requests/999999/respond")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
