import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from types import SimpleNamespace

from backend.core.models import User, Organization, HospitalBloodBankLink, BloodRequest
from backend.core.security import hash_password, get_current_user
from backend.main import app


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def ensure_user(user_id=500):
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            return u
        u = User(
            id=user_id,
            full_name="Patient",
            dob=datetime.date(1980, 1, 1),
            blood_group="A+",
            phone_number="000",
            email=f"p{user_id}@example.com",
            address="x",
            password_hash=hash_password("pwd"),
            aadhaar_number_redacted="xx",
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u
    finally:
        db.close()


def ensure_org(org_id, org_type="HOSPITAL"):
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if org:
            return org
        org = Organization(
            id=org_id,
            org_name=f"Org{org_id}",
            org_type=org_type,
            poc_name="p",
            poc_contact="c",
            email=f"org{org_id}@example.com",
            registration_number_hrf_id=str(org_id),
            address="addr",
            password_hash=hash_password("pwd"),
            approval_status="APPROVED",
        )
        db.add(org)
        db.commit()
        db.refresh(org)
        return org
    finally:
        db.close()


def test_hospital_raise_blood_request_success(api_client):
    user = ensure_user(501)
    hospital = ensure_org(101, org_type="HOSPITAL")

    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hospital.id, role="hospital")
    try:
        payload = {
            "patient_name": "PatientX",
            "blood_group_required": "A+",
            "units_required": 1,
            "hospital_id": hospital.id,
            "priority": "URGENT",
            "emergency_reason": "x",
            "requester_id": user.id,
        }
        resp = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "PENDING"
        assert data["hospital_id"] == hospital.id
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
        else:
            app.dependency_overrides.pop(get_current_user, None)


def test_hospital_raise_blood_request_missing_patient(api_client):
    hospital = ensure_org(102, org_type="HOSPITAL")
    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hospital.id, role="hospital")
    try:
        payload = {
            "patient_name": "NoPatient",
            "blood_group_required": "A+",
            "units_required": 1,
            "hospital_id": hospital.id,
            "priority": "URGENT",
            "emergency_reason": "x",
            "requester_id": 99999,
        }
        resp = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        print(resp.json())
        assert resp.status_code == 404
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
        else:
            app.dependency_overrides.pop(get_current_user, None)


def test_list_and_get_and_forbidden(api_client):
    user = ensure_user(502)
    hosp1 = ensure_org(103, org_type="HOSPITAL")
    hosp2 = ensure_org(104, org_type="HOSPITAL")

    # create a request for hosp1
    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp1.id, role="hospital")
    try:
        payload = {
            "patient_name": "LPatient",
            "blood_group_required": "B+",
            "units_required": 2,
            "hospital_id": hosp1.id,
            "priority": "PLANNED",
            "requester_id": user.id,
        }
        r = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        assert r.status_code == 200
        req_id = r.json()["id"]

        # list should include
        resp = api_client.get("/api/v1/hospital/blood-requests")
        assert resp.status_code == 200
        assert any(it["id"] == req_id for it in resp.json())
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original
        else:
            app.dependency_overrides.pop(get_current_user, None)

    # get detail as hosp2 -> should be forbidden
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp2.id, role="hospital")
    try:
        resp = api_client.get(f"/api/v1/hospital/blood-requests/{req_id}")
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_confirm_blood_received(api_client):
    user = ensure_user(503)
    hosp = ensure_org(105, org_type="HOSPITAL")
    # create request
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        payload = {
            "patient_name": "Recv",
            "blood_group_required": "O+",
            "units_required": 1,
            "hospital_id": hosp.id,
            "priority": "EMERGENCY",
            "requester_id": user.id,
        }
        r = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        req_id = r.json()["id"]

        # confirming receipt before the blood bank has dispatched should 409
        premature = api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/received")
        assert premature.status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # fast-forward the request to DISPATCHED to test the happy path
    db = SessionLocal()
    try:
        br = db.query(BloodRequest).filter(BloodRequest.id == req_id).first()
        br.status = "DISPATCHED"
        db.add(br)
        db.commit()
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        patch = api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/received")
        assert patch.status_code == 200
        assert patch.json()["status"] == "BLOOD_RECEIVED"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_request_blood_bank_link_and_get_linked(api_client):
    hosp = ensure_org(106, org_type="HOSPITAL")
    bank = ensure_org(201, org_type="BLOOD_BANK")

    # hospital requests link
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.post("/api/v1/hospital/blood-bank-link", json={"blood_bank_id": bank.id})
        assert resp.status_code == 200
        link = resp.json()
        print(link)
        assert link["status"] == "PENDING"

        # approve the link in DB to simulate admin action
        db = SessionLocal()
        try:
            hb = db.query(HospitalBloodBankLink).filter(HospitalBloodBankLink.hospital_id == hosp.id, HospitalBloodBankLink.blood_bank_id == bank.id).first()
            hb.status = "APPROVED"
            db.add(hb)
            db.commit()
        finally:
            db.close()

        # get linked bank
        resp2 = api_client.get("/api/v1/hospital/linked-blood-bank")
       
        assert resp2.status_code == 200
        assert resp2.json()["id"] == bank.id
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_request_blood_bank_not_found(api_client):
    hosp = ensure_org(107, org_type="HOSPITAL")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.post("/api/v1/hospital/blood-bank-link", json={"blood_bank_id": 999999})
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_hospital_blood_request_requires_auth(api_client):
    original = app.dependency_overrides.pop(get_current_user, None)
    try:
        resp = api_client.post(
            "/api/v1/hospital/blood-requests",
            json={
                "patient_name": "NoAuth",
                "blood_group_required": "A+",
                "units_required": 1,
                "hospital_id": 999,
                "priority": "URGENT",
                "requester_id": 500,
            },
        )
        assert resp.status_code == 401
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original


def test_hospital_blood_request_missing_patient_validation(api_client):
    hosp = ensure_org(108, org_type="HOSPITAL")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.post(
            "/api/v1/hospital/blood-requests",
            json={
                "patient_name": "MissingRequester",
                "blood_group_required": "A+",
                "units_required": 1,
                "hospital_id": hosp.id,
                "priority": "URGENT",
            },
        )
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_hospital_blood_request_not_found(api_client):
    hosp = ensure_org(109, org_type="HOSPITAL")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.get("/api/v1/hospital/blood-requests/999999")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_hospital_blood_request_received_not_found(api_client):
    hosp = ensure_org(110, org_type="HOSPITAL")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.patch("/api/v1/hospital/blood-requests/999999/received")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_hospital_linked_blood_bank_without_approved_link(api_client):
    hosp = ensure_org(111, org_type="HOSPITAL")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.get("/api/v1/hospital/linked-blood-bank")
        assert resp.status_code == 200
        assert resp.json() is None
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_search_approved_blood_banks(api_client):
    hosp = ensure_org(112, org_type="HOSPITAL")
    bank1 = ensure_org(202, org_type="BLOOD_BANK")

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.get("/api/v1/hospital/approved-blood-banks")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert any(b["id"] == bank1.id for b in data)

        resp_q = api_client.get(f"/api/v1/hospital/approved-blood-banks?q={bank1.org_name}")
        assert resp_q.status_code == 200
        data_q = resp_q.json()
        assert len(data_q) == 1
        assert data_q[0]["id"] == bank1.id

        resp_empty = api_client.get("/api/v1/hospital/approved-blood-banks?q=nonexistent_bank_name_xyz")
        assert resp_empty.status_code == 200
        assert len(resp_empty.json()) == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_search_unapproved_blood_banks_not_returned(api_client):
    hosp = ensure_org(113, org_type="HOSPITAL")
    db = SessionLocal()
    try:
        pending_bank = db.query(Organization).filter(Organization.id == 203).first()
        if not pending_bank:
            pending_bank = Organization(
                id=203,
                org_name="PendingBank203",
                org_type="BLOOD_BANK",
                poc_name="p",
                poc_contact="c",
                email="pending203@example.com",
                registration_number_hrf_id="203",
                address="addr",
                password_hash=hash_password("pwd"),
                approval_status="PENDING",
            )
            db.add(pending_bank)
            db.commit()
            db.refresh(pending_bank)
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        resp = api_client.get(f"/api/v1/hospital/approved-blood-banks?q={pending_bank.org_name}")
        assert resp.status_code == 200
        assert len(resp.json()) == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_search_blood_banks_unauthorized(api_client):
    # Test 403 Forbidden for non-hospital roles (api_client defaults to admin role)
    resp_forbidden = api_client.get("/api/v1/hospital/approved-blood-banks")
    assert resp_forbidden.status_code == 403

    # Test 401 Unauthorized for anonymous requests
    original = app.dependency_overrides.pop(get_current_user, None)
    try:
        resp_unauthorized = api_client.get("/api/v1/hospital/approved-blood-banks")
        assert resp_unauthorized.status_code == 401
    finally:
        if original is not None:
            app.dependency_overrides[get_current_user] = original


def test_verify_request_accept_requires_linked_blood_bank(api_client):
    user = ensure_user(504)
    hosp = ensure_org(114, org_type="HOSPITAL")
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        payload = {
            "patient_name": "NeedsBank",
            "blood_group_required": "O+",
            "units_required": 1,
            "hospital_id": hosp.id,
            "priority": "URGENT",
            "requester_id": user.id,
        }
        r = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        req_id = r.json()["id"]

        # no approved blood bank link yet -> accept should 409
        resp = api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/verify", json={"approve": True})
        assert resp.status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_verify_request_accept_and_reject(api_client):
    user = ensure_user(505)
    hosp = ensure_org(115, org_type="HOSPITAL")
    bank = ensure_org(204, org_type="BLOOD_BANK")

    db = SessionLocal()
    try:
        link = HospitalBloodBankLink(hospital_id=hosp.id, blood_bank_id=bank.id, status="APPROVED")
        db.add(link)
        db.commit()
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=hosp.id, role="hospital")
    try:
        payload = {
            "patient_name": "Accepted",
            "blood_group_required": "O+",
            "units_required": 1,
            "hospital_id": hosp.id,
            "priority": "URGENT",
            "requester_id": user.id,
        }
        r = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        req_id = r.json()["id"]

        resp = api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/verify", json={"approve": True})
        assert resp.status_code == 200
        assert resp.json()["status"] == "VERIFIED"

        # already-verified request can't be re-verified
        resp2 = api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/verify", json={"approve": True})
        assert resp2.status_code == 409

        payload["patient_name"] = "Rejected"
        r2 = api_client.post("/api/v1/hospital/blood-requests", json=payload)
        req2_id = r2.json()["id"]
        resp3 = api_client.patch(
            f"/api/v1/hospital/blood-requests/{req2_id}/verify",
            json={"approve": False, "rejection_reason": "Not needed"},
        )
        assert resp3.status_code == 200
        assert resp3.json()["status"] == "REJECTED"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
