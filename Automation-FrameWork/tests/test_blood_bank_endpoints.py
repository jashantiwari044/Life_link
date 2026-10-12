import datetime
from types import SimpleNamespace
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.models import (
    Organization, HospitalBloodBankLink, User, BloodRequest,
    RequestFulfillment, CommunityResponse, BloodInventory
)
from backend.core.security import get_current_user
from backend.main import app


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def _create_org(db, email, org_type="BLOOD_BANK", approved=True):
    org = db.query(Organization).filter(Organization.email == email).first()
    if org:
        return org
    org = Organization(
        org_name=email.split("@")[0],
        org_type=org_type,
        poc_name="p",
        poc_contact="c",
        email=email,
        registration_number_hrf_id=email,
        address="addr",
        password_hash="x",
        approval_status="APPROVED" if approved else "PENDING",
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def _create_user(db, email="bb_user@example.com"):
    u = db.query(User).filter(User.email == email).first()
    if u:
        return u
    u = User(full_name="u", dob=datetime.date(1990, 1, 1), blood_group="O+",
             phone_number="000", email=email, address="a", password_hash="x", aadhaar_number_redacted="xx")
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def test_list_incoming_requests(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb1@example.com", org_type="BLOOD_BANK")
        hospital = _create_org(db, "h1@example.com", org_type="HOSPITAL")

        # create approved link
        link = HospitalBloodBankLink(hospital_id=hospital.id, blood_bank_id=blood_bank.id, status="APPROVED")
        db.add(link)

        user = _create_user(db, "req_user@example.com")
        br = BloodRequest(requester_id=user.id, patient_name="P", blood_group_required="O+", units_required=1,
                          hospital_id=hospital.id, priority="EMERGENCY", status="VERIFIED")
        db.add(br)
        db.commit()
        db.refresh(br)

        blood_bank_id = blood_bank.id
        hospital_id = hospital.id
        br_id = br.id
    finally:
        db.close()

    # override role as blood_bank
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.get("/api/v1/blood-bank/incoming-requests")
        assert resp.status_code == 200
        data = resp.json()
        assert any(r["id"] == br_id for r in data)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_process_fulfillment_direct_and_community(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb2@example.com", org_type="BLOOD_BANK")
        hospital = _create_org(db, "h2@example.com", org_type="HOSPITAL")
        user = _create_user(db, "rr@example.com")
        br = BloodRequest(requester_id=user.id, patient_name="P2", blood_group_required="A+", units_required=1,
                          hospital_id=hospital.id, priority="URGENT", status="VERIFIED")
        db.add(br)
        db.commit()
        db.refresh(br)

        blood_bank_id = blood_bank.id
        hospital_id = hospital.id
        br_id = br.id
    finally:
        db.close()

    # attempt fulfill without link -> should 403
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        r = api_client.patch(f"/api/v1/blood-bank/requests/{br_id}/fulfill")
        assert r.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # now create approved link and retry with no stock -> should publish to community (OPEN)
    db = SessionLocal()
    try:
        link = HospitalBloodBankLink(hospital_id=hospital_id, blood_bank_id=blood_bank_id, status="APPROVED")
        db.add(link)
        db.commit()
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        r = api_client.patch(f"/api/v1/blood-bank/requests/{br_id}/fulfill")
        assert r.status_code == 200
        assert r.json()["status"] == "OPEN"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # verify fulfillment exists as COMMUNITY, assigned to this blood bank
    db = SessionLocal()
    try:
        fulfillment = db.query(RequestFulfillment).filter(RequestFulfillment.request_id == br_id).first()
        assert fulfillment is not None
        assert fulfillment.assigned_blood_bank_id == blood_bank_id
        assert fulfillment.fulfillment_type == "COMMUNITY"
        req = db.query(BloodRequest).filter(BloodRequest.id == br_id).first()
        assert req.status == "OPEN"
    finally:
        db.close()

    # a second VERIFIED request with sufficient stock should fulfill DIRECT
    db = SessionLocal()
    try:
        br2 = BloodRequest(requester_id=1, patient_name="P2-direct", blood_group_required="A+", units_required=1,
                           hospital_id=hospital_id, priority="URGENT", status="VERIFIED")
        db.add(br2)
        inventory_row = db.query(BloodInventory).filter(
            BloodInventory.blood_bank_id == blood_bank_id, BloodInventory.blood_group == "A+"
        ).first()
        if inventory_row:
            inventory_row.units_available = 5
            db.add(inventory_row)
        else:
            db.add(BloodInventory(blood_bank_id=blood_bank_id, blood_group="A+", units_available=5))
        db.commit()
        db.refresh(br2)
        br2_id = br2.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        r2 = api_client.patch(f"/api/v1/blood-bank/requests/{br2_id}/fulfill")
        assert r2.status_code == 200
        assert r2.json()["status"] == "READY_FOR_DISPATCH"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    db = SessionLocal()
    try:
        fulfillment2 = db.query(RequestFulfillment).filter(RequestFulfillment.request_id == br2_id).first()
        assert fulfillment2.fulfillment_type == "DIRECT"
        inventory = db.query(BloodInventory).filter(
            BloodInventory.blood_bank_id == blood_bank_id, BloodInventory.blood_group == "A+"
        ).first()
        assert inventory.units_available == 4
    finally:
        db.close()


def test_verify_donor_blood(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb3@example.com", org_type="BLOOD_BANK")
        hospital = _create_org(db, "h3@example.com", org_type="HOSPITAL")
        donor = _create_user(db, "donor@example.com")
        requester = _create_user(db, "req2@example.com")
        br = BloodRequest(requester_id=requester.id, patient_name="PV", blood_group_required="B+", units_required=1,
                          hospital_id=hospital.id, priority="PLANNED", status="OPEN")
        db.add(br)
        db.commit()
        db.refresh(br)

        # create fulfillment and assign to blood bank
        f = RequestFulfillment(request_id=br.id, fulfillment_type="COMMUNITY", assigned_blood_bank_id=blood_bank.id)
        db.add(f)

        # create community response
        cr = CommunityResponse(request_id=br.id, responder_type="DONOR", donor_id=donor.id, status="ACCEPTED")
        db.add(cr)
        db.commit()
        db.refresh(cr)

        blood_bank_id = blood_bank.id
        br_id = br.id
        cr_id = cr.id
        donor_id = donor.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.patch(f"/api/v1/blood-bank/community-responses/{cr_id}/verify")
        assert resp.status_code == 200
        assert resp.json().get("status") == "BLOOD_COLLECTED"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    db = SessionLocal()
    try:
        donor_db = db.query(User).filter(User.id == donor_id).first()
        assert donor_db.last_donation_date is not None
        br_db = db.query(BloodRequest).filter(BloodRequest.id == br_id).first()
        assert br_db.status == "READY_FOR_DISPATCH"
    finally:
        db.close()


def test_mark_dispatched(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb11@example.com", org_type="BLOOD_BANK")
        hospital = _create_org(db, "h11@example.com", org_type="HOSPITAL")
        user = _create_user(db, "dispatch_req@example.com")
        br = BloodRequest(requester_id=user.id, patient_name="Dispatch", blood_group_required="O+", units_required=1,
                          hospital_id=hospital.id, priority="URGENT", status="READY_FOR_DISPATCH")
        db.add(br)
        db.commit()
        db.refresh(br)
        db.add(RequestFulfillment(request_id=br.id, fulfillment_type="DIRECT", assigned_blood_bank_id=blood_bank.id))
        db.commit()

        blood_bank_id = blood_bank.id
        br_id = br.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.patch(f"/api/v1/blood-bank/requests/{br_id}/dispatch")
        assert resp.status_code == 200
        assert resp.json()["status"] == "DISPATCHED"

        # dispatching again should 409 (already DISPATCHED)
        resp2 = api_client.patch(f"/api/v1/blood-bank/requests/{br_id}/dispatch")
        assert resp2.status_code == 409
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_link_requests_and_approve(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb4@example.com", org_type="BLOOD_BANK")
        hospital = _create_org(db, "h4@example.com", org_type="HOSPITAL")
        link = HospitalBloodBankLink(hospital_id=hospital.id, blood_bank_id=blood_bank.id, status="PENDING")
        db.add(link)
        db.commit()
        db.refresh(link)

        blood_bank_id = blood_bank.id
        link_id = link.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        r = api_client.get("/api/v1/blood-bank/link-requests")
        assert r.status_code == 200
        assert any(l["id"] == link_id for l in r.json())

        apr = api_client.patch(f"/api/v1/blood-bank/link-requests/{link_id}", json={"approve": True})
        assert apr.status_code == 200
        assert apr.json().get("status") == "APPROVED"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_incoming_requests_without_link_returns_empty_list(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb5@example.com", org_type="BLOOD_BANK")
        blood_bank_id = blood_bank.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.get("/api/v1/blood-bank/incoming-requests")
        assert resp.status_code == 200
        assert resp.json() == []
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_fulfill_nonexistent_request_returns_not_found(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb6@example.com", org_type="BLOOD_BANK")
        blood_bank_id = blood_bank.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.patch("/api/v1/blood-bank/requests/999999/fulfill")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_verify_nonexistent_community_response_returns_not_found(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb8@example.com", org_type="BLOOD_BANK")
        blood_bank_id = blood_bank.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.patch("/api/v1/blood-bank/community-responses/999999/verify")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_link_request_not_found_returns_not_found(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb9@example.com", org_type="BLOOD_BANK")
        blood_bank_id = blood_bank.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.patch("/api/v1/blood-bank/link-requests/999999", json={"approve": True})
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_linked_hospitals_without_links_returns_empty_list(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb10@example.com", org_type="BLOOD_BANK")
        blood_bank_id = blood_bank.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.get("/api/v1/blood-bank/linked-hospitals")
        assert resp.status_code == 200
        assert resp.json() == []
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_inventory_get_and_set(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb12@example.com", org_type="BLOOD_BANK")
        blood_bank_id = blood_bank.id
    finally:
        db.close()

    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=blood_bank_id, role="blood_bank")
    try:
        resp = api_client.get("/api/v1/blood-bank/inventory")
        assert resp.status_code == 200
        assert len(resp.json()) == 8

        put_resp = api_client.put("/api/v1/blood-bank/inventory/O+", json={"units_available": 10})
        assert put_resp.status_code == 200
        assert put_resp.json()["units_available"] == 10

        bad_resp = api_client.put("/api/v1/blood-bank/inventory/ZZ", json={"units_available": 1})
        assert bad_resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_create_shortage_alert_and_ngo_mobilize(api_client):
    db = SessionLocal()
    try:
        blood_bank = _create_org(db, "bb_alert@example.com", org_type="BLOOD_BANK")
        ngo = _create_org(db, "ngo_alert@example.com", org_type="NGO")
        bank_id = blood_bank.id
        ngo_id = ngo.id
    finally:
        db.close()

    # 1. Blood bank posts shortage alert with priority value "EMERGENCY"
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=bank_id, role="blood_bank")
    try:
        resp = api_client.post(
            "/api/v1/blood-bank/shortage-alerts",
            json={
                "blood_group": "O+",
                "units_needed": 5,
                "urgency": "EMERGENCY",
                "message": "Urgent requisition shortage for Test Hospital."
            }
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["blood_group"] == "O+"
        assert data["units_needed"] == 5
        assert data["urgency"] == "CRITICAL"  # normalized
        alert_id = data["id"]

        # List bank shortage alerts
        list_resp = api_client.get("/api/v1/blood-bank/shortage-alerts")
        assert list_resp.status_code == 200
        assert any(a["id"] == alert_id for a in list_resp.json())
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    # 2. NGO lists shortage alerts
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=ngo_id, role="ngo")
    try:
        ngo_alerts = api_client.get("/api/v1/ngo/shortage-alerts")
        assert ngo_alerts.status_code == 200
        found = next((a for a in ngo_alerts.json() if a["id"] == alert_id), None)
        assert found is not None
        assert found["status"] == "ACTIVE"

        # 3. NGO mobilizes a donation camp tied to this shortage alert
        camp_resp = api_client.post(
            f"/api/v1/ngo/camps?shortage_alert_id={alert_id}",
            json={
                "title": "Emergency O+ Blood Drive",
                "venue": "City Center Hall",
                "date_time": (datetime.datetime.utcnow() + datetime.timedelta(days=2)).isoformat(),
                "contact_info": "9876543210"
            }
        )
        assert camp_resp.status_code in (200, 201)

        # 4. Verify shortage alert status transitioned to DRIVE_SCHEDULED
        ngo_alerts_after = api_client.get("/api/v1/ngo/shortage-alerts")
        updated_alert = next((a for a in ngo_alerts_after.json() if a["id"] == alert_id), None)
        assert updated_alert is not None
        assert updated_alert["status"] == "DRIVE_SCHEDULED"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

