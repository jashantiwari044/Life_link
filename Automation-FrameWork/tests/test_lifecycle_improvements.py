"""Covers the backend half of the improvement plan:

* blood bank incoming requests span every non-terminal status (Issues 2, 13)
* one hospital -> one blood bank, with unlink and re-link (Issues 3, 4, 15)
* blood request responses embed the hospital instead of a bare id (Issues 2, 14)
* donation camps persist and return map coordinates (Issue 11)
"""

import datetime
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.models import (
    Organization, User, BloodRequest, HospitalBloodBankLink, DonationCamp,
    CommunityResponse, RequestFulfillment, BloodInventory
)
from backend.core.security import get_current_user
from backend.services.request_status import BLOOD_GROUPS as BLOOD_GROUPS_EXPECTED
from backend.main import app


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def _org(db, email, org_type, name=None):
    """Returns a detached snapshot so ids stay readable after the session closes."""
    org = db.query(Organization).filter(Organization.email == email).first()
    if org:
        return SimpleNamespace(id=org.id, org_name=org.org_name)
    org = Organization(
        org_name=name or email.split("@")[0],
        org_type=org_type,
        poc_name="POC Name",
        poc_contact="9000000000",
        email=email,
        registration_number_hrf_id=email,
        address="12 Main Street",
        password_hash="x",
        approval_status="APPROVED",
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return SimpleNamespace(id=org.id, org_name=org.org_name)


def _user(db, email, donor_mode=False):
    u = db.query(User).filter(User.email == email).first()
    if u:
        return SimpleNamespace(id=u.id)
    u = User(
        full_name="Improvement Tester", dob=datetime.date(1990, 1, 1), blood_group="O+",
        phone_number=f"9{abs(hash(email)) % 10**9:09d}", email=email, address="a",
        password_hash="x", aadhaar_number_redacted="xx", donor_mode_enabled=donor_mode,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return SimpleNamespace(id=u.id)


def _request(db, requester_id, hospital_id, status, blood_group="O+"):
    br = BloodRequest(
        requester_id=requester_id, patient_name="Patient", blood_group_required=blood_group,
        units_required=1, hospital_id=hospital_id, priority="URGENT", status=status,
    )
    db.add(br)
    db.commit()
    db.refresh(br)
    return SimpleNamespace(id=br.id)


def _link(db, hospital_id, blood_bank_id, status):
    row = db.query(HospitalBloodBankLink).filter(
        HospitalBloodBankLink.hospital_id == hospital_id,
        HospitalBloodBankLink.blood_bank_id == blood_bank_id,
    ).first()
    if row:
        row.status = status
    else:
        row = HospitalBloodBankLink(hospital_id=hospital_id, blood_bank_id=blood_bank_id, status=status)
        db.add(row)
    db.commit()
    db.refresh(row)
    return SimpleNamespace(id=row.id)


def _as(role, org_or_user):
    # donor_mode_enabled / last_donation_date keep the donor-eligibility helper happy
    principal = SimpleNamespace(
        id=org_or_user.id, role=role, donor_mode_enabled=False, last_donation_date=None
    )
    app.dependency_overrides[get_current_user] = lambda: principal


def _reset_auth():
    app.dependency_overrides.pop(get_current_user, None)


# --------------------------------------------------------------------------
# Issues 2 & 13 - incoming requests must not be limited to VERIFIED
# --------------------------------------------------------------------------

def test_incoming_requests_span_all_non_terminal_statuses(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "imp_bank1@example.com", "BLOOD_BANK", "Central Blood Bank")
        hospital = _org(db, "imp_hosp1@example.com", "HOSPITAL", "St. Mary Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        user = _user(db, "imp_u1@example.com")

        expected = {}
        for st in ["PENDING", "VERIFIED", "OPEN", "READY_FOR_DISPATCH", "DISPATCHED"]:
            expected[st] = _request(db, user.id, hospital.id, st).id
        # terminal statuses must stay out of the list
        hidden = {st: _request(db, user.id, hospital.id, st).id
                  for st in ["BLOOD_RECEIVED", "CANCELLED", "REJECTED"]}
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        res = api_client.get("/api/v1/blood-bank/incoming-requests")
        assert res.status_code == 200
        returned = {row["id"] for row in res.json()}
        for st, rid in expected.items():
            assert rid in returned, f"{st} request should be visible to the blood bank"
        for st, rid in hidden.items():
            assert rid not in returned, f"{st} request should not be visible to the blood bank"
    finally:
        _reset_auth()


def test_incoming_requests_embed_hospital_details(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "imp_bank2@example.com", "BLOOD_BANK", "Rose Blood Bank")
        hospital = _org(db, "imp_hosp2@example.com", "HOSPITAL", "Apollo Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        user = _user(db, "imp_u2@example.com")
        req_id = _request(db, user.id, hospital.id, "VERIFIED").id
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        res = api_client.get("/api/v1/blood-bank/incoming-requests")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["id"] == req_id)
        assert row["hospital"] is not None
        assert row["hospital"]["org_name"] == "Apollo Hospital"
        assert row["hospital"]["address"] == "12 Main Street"
    finally:
        _reset_auth()


def test_my_requests_embed_hospital_name(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp3@example.com", "HOSPITAL", "Fortis Hospital")
        user = _user(db, "imp_u3@example.com")
        req_id = _request(db, user.id, hospital.id, "PENDING").id
    finally:
        db.close()

    _as("user", user)
    try:
        res = api_client.get("/api/v1/blood-requests/mine")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["id"] == req_id)
        assert row["hospital"]["org_name"] == "Fortis Hospital"
        # the raw id stays available for callers that still key off it
        assert row["hospital_id"] == hospital.id
    finally:
        _reset_auth()


def test_published_requests_still_serialize_with_embedded_hospital(api_client):
    """BloodRequestForDonorResponse re-validates the nested hospital dict."""
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp4@example.com", "HOSPITAL", "Max Hospital")
        user = _user(db, "imp_u4@example.com")
        req_id = _request(db, user.id, hospital.id, "OPEN").id
    finally:
        db.close()

    _as("user", user)
    try:
        res = api_client.get("/api/v1/users/published-requests")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["id"] == req_id)
        assert row["hospital"]["org_name"] == "Max Hospital"
        assert "is_eligible_now" in row
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# Issue 3 - one hospital, one blood bank (+ unlink)
# --------------------------------------------------------------------------

def test_hospital_can_link_second_blood_bank(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp5@example.com", "HOSPITAL", "Link Hospital")
        bank_a = _org(db, "imp_bank_a@example.com", "BLOOD_BANK", "Bank A")
        bank_b = _org(db, "imp_bank_b@example.com", "BLOOD_BANK", "Bank B")
        _link(db, hospital.id, bank_a.id, "APPROVED")
        bank_b_id = bank_b.id
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.post("/api/v1/hospital/blood-bank-link", json={"blood_bank_id": bank_b_id})
        assert res.status_code == 200
        assert res.json()["status"] == "PENDING"
    finally:
        _reset_auth()



def test_hospital_relinking_same_bank_is_idempotent(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp6@example.com", "HOSPITAL", "Idem Hospital")
        bank = _org(db, "imp_bank_c@example.com", "BLOOD_BANK", "Bank C")
        _link(db, hospital.id, bank.id, "APPROVED")
        bank_id = bank.id
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.post("/api/v1/hospital/blood-bank-link", json={"blood_bank_id": bank_id})
        assert res.status_code == 200
        assert res.json()["status"] == "APPROVED"
    finally:
        _reset_auth()


def test_unlink_then_link_new_blood_bank(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp7@example.com", "HOSPITAL", "Switch Hospital")
        bank_a = _org(db, "imp_bank_d@example.com", "BLOOD_BANK", "Bank D")
        bank_b = _org(db, "imp_bank_e@example.com", "BLOOD_BANK", "Bank E")
        _link(db, hospital.id, bank_a.id, "APPROVED")
        bank_a_id, bank_b_id = bank_a.id, bank_b.id
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        unlink = api_client.delete("/api/v1/hospital/blood-bank-link")
        assert unlink.status_code == 200
        assert unlink.json()["status"] == "UNLINKED"

        assert api_client.get("/api/v1/hospital/linked-blood-bank").json() is None

        # a fresh bank can now be requested
        res = api_client.post("/api/v1/hospital/blood-bank-link", json={"blood_bank_id": bank_b_id})
        assert res.status_code == 200
        assert res.json()["status"] == "PENDING"

        # and the previously unlinked bank can be re-requested too
        again = api_client.post("/api/v1/hospital/blood-bank-link", json={"blood_bank_id": bank_a_id})
        assert again.status_code == 200
        assert again.json()["status"] == "PENDING"
    finally:
        _reset_auth()


def test_unlink_blocked_while_requests_in_flight(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp8@example.com", "HOSPITAL", "Busy Hospital")
        bank = _org(db, "imp_bank_f@example.com", "BLOOD_BANK", "Bank F")
        _link(db, hospital.id, bank.id, "APPROVED")
        user = _user(db, "imp_u8@example.com")
        _request(db, user.id, hospital.id, "READY_FOR_DISPATCH")
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.delete("/api/v1/hospital/blood-bank-link")
        assert res.status_code == 409
        assert "still being fulfilled" in res.json()["detail"]
    finally:
        _reset_auth()


def test_unlink_without_a_link_returns_404(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp9@example.com", "HOSPITAL", "Lonely Hospital")
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        assert api_client.delete("/api/v1/hospital/blood-bank-link").status_code == 404
    finally:
        _reset_auth()


def test_hospital_can_list_its_own_link_rows(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp10@example.com", "HOSPITAL", "Listing Hospital")
        bank_a = _org(db, "imp_bank_g@example.com", "BLOOD_BANK", "Bank G")
        bank_b = _org(db, "imp_bank_h@example.com", "BLOOD_BANK", "Bank H")
        _link(db, hospital.id, bank_a.id, "PENDING")
        _link(db, hospital.id, bank_b.id, "REJECTED")
        bank_a_id, bank_b_id = bank_a.id, bank_b.id
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.get("/api/v1/hospital/blood-bank-links")
        assert res.status_code == 200
        by_bank = {row["blood_bank_id"]: row["status"] for row in res.json()}
        assert by_bank[bank_a_id] == "PENDING"
        assert by_bank[bank_b_id] == "REJECTED"
    finally:
        _reset_auth()


def test_second_bank_cannot_approve_link_for_already_linked_hospital(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp11@example.com", "HOSPITAL", "Contested Hospital")
        bank_a = _org(db, "imp_bank_i@example.com", "BLOOD_BANK", "Bank I")
        bank_b = _org(db, "imp_bank_j@example.com", "BLOOD_BANK", "Bank J")
        _link(db, hospital.id, bank_a.id, "APPROVED")
        pending = _link(db, hospital.id, bank_b.id, "PENDING")
        pending_id = pending.id
    finally:
        db.close()

    _as("blood_bank", bank_b)
    try:
        res = api_client.patch(f"/api/v1/blood-bank/link-requests/{pending_id}", json={"approve": True})
        assert res.status_code == 200
        assert res.json()["status"] == "APPROVED"
    finally:
        _reset_auth()



# --------------------------------------------------------------------------
# Issue 11 - donation camp coordinates
# --------------------------------------------------------------------------

def test_camp_created_with_coordinates_round_trips(api_client):
    db = SessionLocal()
    try:
        ngo = _org(db, "imp_ngo1@example.com", "NGO", "Helping Hands")
    finally:
        db.close()

    _as("ngo", ngo)
    try:
        payload = {
            "title": "Ranchi Mega Drive",
            "venue": "RIMS, Ranchi",
            "date_time": "2030-01-01T10:00:00",
            "contact_info": "Dr. Amit, 9000000000",
            "latitude": 23.3441,
            "longitude": 85.3096,
        }
        res = api_client.post("/api/v1/ngo/camps", json=payload)
        assert res.status_code == 200
        body = res.json()
        assert body["latitude"] == 23.3441
        assert body["longitude"] == 85.3096

        detail = api_client.get(f"/api/v1/ngo/camps/{body['id']}")
        assert detail.json()["latitude"] == 23.3441
    finally:
        _reset_auth()

    db = SessionLocal()
    try:
        stored = db.query(DonationCamp).filter(DonationCamp.title == "Ranchi Mega Drive").first()
        assert stored is not None
        assert float(stored.latitude) == 23.3441
        assert float(stored.longitude) == 85.3096
    finally:
        db.close()


def test_camp_without_coordinates_is_still_accepted(api_client):
    db = SessionLocal()
    try:
        ngo = _org(db, "imp_ngo2@example.com", "NGO", "No Map NGO")
    finally:
        db.close()

    _as("ngo", ngo)
    try:
        res = api_client.post("/api/v1/ngo/camps", json={
            "title": "Venue Only Drive",
            "venue": "Community Hall",
            "date_time": "2030-02-01T10:00:00",
            "contact_info": "9000000000",
        })
        assert res.status_code == 200
        assert res.json()["latitude"] is None
        assert res.json()["longitude"] is None
    finally:
        _reset_auth()


def test_public_camps_list_exposes_coordinates(api_client):
    db = SessionLocal()
    try:
        ngo = _org(db, "imp_ngo3@example.com", "NGO", "Map NGO")
        user = _user(db, "imp_u12@example.com")
        camp = DonationCamp(
            ngo_id=ngo.id, title="Mapped Camp", venue="Stadium",
            date_time=datetime.datetime.utcnow() + datetime.timedelta(days=10),
            contact_info="900", latitude=19.076, longitude=72.8777,
        )
        db.add(camp)
        db.commit()
        db.refresh(camp)
        camp_id = camp.id
    finally:
        db.close()

    _as("user", user)
    try:
        res = api_client.get("/api/v1/camps")
        assert res.status_code == 200
        row = next(c for c in res.json() if c["id"] == camp_id)
        assert row["latitude"] == 19.076
        assert row["longitude"] == 72.8777
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# Link rows must name the other org, not just carry its id
# --------------------------------------------------------------------------

def test_pending_link_request_embeds_hospital_details(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp12@example.com", "HOSPITAL", "Requesting Hospital")
        bank = _org(db, "imp_bank_k@example.com", "BLOOD_BANK", "Bank K")
        _link(db, hospital.id, bank.id, "PENDING")
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        res = api_client.get("/api/v1/blood-bank/link-requests")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["hospital_id"] == hospital.id)
        assert row["hospital"]["org_name"] == "Requesting Hospital"
        assert row["hospital"]["address"] == "12 Main Street"
        assert row["hospital"]["registration_number_hrf_id"] == "imp_hosp12@example.com"
    finally:
        _reset_auth()


def test_hospital_link_list_embeds_blood_bank_details(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "imp_hosp13@example.com", "HOSPITAL", "Naming Hospital")
        bank = _org(db, "imp_bank_l@example.com", "BLOOD_BANK", "Bank L")
        _link(db, hospital.id, bank.id, "PENDING")
        bank_id = bank.id
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.get("/api/v1/hospital/blood-bank-links")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["blood_bank_id"] == bank_id)
        assert row["blood_bank"]["org_name"] == "Bank L"
    finally:
        _reset_auth()


def test_ngo_active_requests_embed_hospital(api_client):
    db = SessionLocal()
    try:
        ngo = _org(db, "imp_ngo4@example.com", "NGO", "Named NGO")
        hospital = _org(db, "imp_hosp14@example.com", "HOSPITAL", "Community Hospital")
        user = _user(db, "imp_u14@example.com")
        req_id = _request(db, user.id, hospital.id, "OPEN").id
    finally:
        db.close()

    _as("ngo", ngo)
    try:
        res = api_client.get("/api/v1/ngo/active-requests")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["id"] == req_id)
        assert row["hospital"]["org_name"] == "Community Hospital"
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# Donor guidance: where to go, whether they still owe a donation, and the
# thank-you once the hospital closes the request.
# --------------------------------------------------------------------------

def _fulfillment(db, request_id, blood_bank_id, kind="COMMUNITY"):
    row = RequestFulfillment(
        request_id=request_id, fulfillment_type=kind, assigned_blood_bank_id=blood_bank_id
    )
    db.add(row)
    db.commit()
    return SimpleNamespace(id=row.id)


def test_published_request_tells_the_donor_where_to_donate(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank1@example.com", "BLOOD_BANK", "Central Collection Centre")
        hospital = _org(db, "don_hosp1@example.com", "HOSPITAL", "Sunrise Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor = _user(db, "don_u1@example.com")
        req_id = _request(db, donor.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id)
    finally:
        db.close()

    _as("user", donor)
    try:
        res = api_client.get("/api/v1/users/published-requests")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["id"] == req_id)
        # the donor must be able to see the collection centre, not just the hospital
        assert row["assigned_blood_bank"] is not None
        assert row["assigned_blood_bank"]["org_name"] == "Central Collection Centre"
        assert row["assigned_blood_bank"]["address"] == "12 Main Street"
        assert row["assigned_blood_bank"]["poc_contact"] == "9000000000"
        assert row["hospital"]["org_name"] == "Sunrise Hospital"
    finally:
        _reset_auth()


def test_donor_commitment_survives_a_reload(api_client):
    """The old UI kept 'Responded' in local state only, so a refresh lost it."""
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank2@example.com", "BLOOD_BANK", "Bank Two")
        hospital = _org(db, "don_hosp2@example.com", "HOSPITAL", "Hospital Two")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor = _user(db, "don_u2@example.com", donor_mode=True)
        req_id = _request(db, donor.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id)
    finally:
        db.close()

    principal = SimpleNamespace(id=donor.id, role="user", donor_mode_enabled=True, last_donation_date=None)
    app.dependency_overrides[get_current_user] = lambda: principal
    try:
        before = api_client.get("/api/v1/users/published-requests").json()
        assert next(r for r in before if r["id"] == req_id)["my_response_status"] is None

        assert api_client.post(f"/api/v1/users/requests/{req_id}/respond").status_code == 200

        # a fresh GET — exactly what a page reload does
        after = api_client.get("/api/v1/users/published-requests").json()
        assert next(r for r in after if r["id"] == req_id)["my_response_status"] == "ACCEPTED"
    finally:
        _reset_auth()


def test_responding_notifies_the_donor_with_the_collection_address(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank3@example.com", "BLOOD_BANK", "Riverside Centre")
        hospital = _org(db, "don_hosp3@example.com", "HOSPITAL", "Hospital Three")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor = _user(db, "don_u3@example.com", donor_mode=True)
        req_id = _request(db, donor.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id)
    finally:
        db.close()

    principal = SimpleNamespace(id=donor.id, role="user", donor_mode_enabled=True, last_donation_date=None)
    app.dependency_overrides[get_current_user] = lambda: principal
    try:
        api_client.post(f"/api/v1/users/requests/{req_id}/respond")
        notes = api_client.get("/api/v1/notifications").json()
        guidance = [n for n in notes if n["title"] == "Next Step: Donate Your Blood"]
        assert guidance, [n["title"] for n in notes]
        body = guidance[0]["message"]
        assert "Riverside Centre" in body
        assert "12 Main Street" in body
        assert "not complete until" in body
    finally:
        _reset_auth()


def test_donation_history_carries_request_context(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank4@example.com", "BLOOD_BANK", "History Centre")
        hospital = _org(db, "don_hosp4@example.com", "HOSPITAL", "History Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor = _user(db, "don_u4@example.com")
        req_id = _request(db, donor.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id)
        db.add(CommunityResponse(
            request_id=req_id, responder_type="DONOR", donor_id=donor.id, status="ACCEPTED"
        ))
        db.commit()
    finally:
        db.close()

    _as("user", donor)
    try:
        res = api_client.get("/api/v1/users/me/donation-history")
        assert res.status_code == 200
        entry = next(e for e in res.json() if e["request_id"] == req_id)
        # history used to render "Request #5" with no way to know what it was
        assert entry["request"]["patient_name"] == "Patient"
        assert entry["request"]["hospital"]["org_name"] == "History Hospital"
        assert entry["request"]["assigned_blood_bank"]["org_name"] == "History Centre"
        assert entry["status"] == "ACCEPTED"
    finally:
        _reset_auth()


def test_blood_bank_can_discover_donors_awaiting_collection(api_client):
    """Without this list the bank had to guess a response id to verify."""
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank5@example.com", "BLOOD_BANK", "Waiting Centre")
        hospital = _org(db, "don_hosp5@example.com", "HOSPITAL", "Waiting Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor = _user(db, "don_u5@example.com")
        req_id = _request(db, donor.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id)
        db.add(CommunityResponse(
            request_id=req_id, responder_type="DONOR", donor_id=donor.id, status="ACCEPTED"
        ))
        db.commit()
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        res = api_client.get("/api/v1/blood-bank/community-responses", params={"status": "ACCEPTED"})
        assert res.status_code == 200
        entry = next(e for e in res.json() if e["request_id"] == req_id)
        # the counter needs a name and a number, not a bare id
        assert entry["donor"]["full_name"] == "Improvement Tester"
        assert entry["donor"]["blood_group"] == "O+"
        assert entry["donor"]["phone_number"]
        assert entry["request"]["patient_name"] == "Patient"

        # collected donations must not show up as still-awaiting
        collected = api_client.get(
            "/api/v1/blood-bank/community-responses", params={"status": "BLOOD_COLLECTED"}
        ).json()
        assert all(e["request_id"] != req_id for e in collected)
    finally:
        _reset_auth()


def test_hospital_confirmation_thanks_every_donor(api_client):
    """The donor was thanked at collection and then never told it helped."""
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank6@example.com", "BLOOD_BANK", "Closing Centre")
        hospital = _org(db, "don_hosp6@example.com", "HOSPITAL", "Closing Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor = _user(db, "don_u6@example.com")
        req_id = _request(db, donor.id, hospital.id, "DISPATCHED").id
        _fulfillment(db, req_id, bank.id)
        db.add(CommunityResponse(
            request_id=req_id, responder_type="DONOR", donor_id=donor.id, status="BLOOD_COLLECTED"
        ))
        db.commit()
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/received")
        assert res.status_code == 200
        assert res.json()["status"] == "BLOOD_RECEIVED"
    finally:
        _reset_auth()

    _as("user", donor)
    try:
        notes = api_client.get("/api/v1/notifications").json()
        thanks = [n for n in notes if n["title"] == "Your Donation Reached the Patient"]
        assert thanks, [n["title"] for n in notes]
        assert "Thank you" in thanks[0]["message"]
    finally:
        _reset_auth()


def test_uncollected_donor_is_not_thanked_on_closure(api_client):
    """Only people who actually gave blood get the completion thank-you."""
    db = SessionLocal()
    try:
        bank = _org(db, "don_bank7@example.com", "BLOOD_BANK", "Partial Centre")
        hospital = _org(db, "don_hosp7@example.com", "HOSPITAL", "Partial Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        no_show = _user(db, "don_u7@example.com")
        req_id = _request(db, no_show.id, hospital.id, "DISPATCHED").id
        _fulfillment(db, req_id, bank.id)
        db.add(CommunityResponse(
            request_id=req_id, responder_type="DONOR", donor_id=no_show.id, status="ACCEPTED"
        ))
        db.commit()
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        api_client.patch(f"/api/v1/hospital/blood-requests/{req_id}/received")
    finally:
        _reset_auth()

    _as("user", no_show)
    try:
        notes = api_client.get("/api/v1/notifications").json()
        assert not [n for n in notes if n["title"] == "Your Donation Reached the Patient"]
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# Inventory bootstrap must survive concurrent first-ever loads. Two overlapping
# requests both inserted the same rows, the loser 500'd, and the blood bank's
# review page — which has no error path — hung on "Loading…" forever.
# --------------------------------------------------------------------------

def test_inventory_bootstrap_is_idempotent(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "inv_bank1@example.com", "BLOOD_BANK", "Bootstrap Bank")
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        first = api_client.get("/api/v1/blood-bank/inventory")
        second = api_client.get("/api/v1/blood-bank/inventory")
        assert first.status_code == 200
        assert second.status_code == 200
        assert len(first.json()) == 8
        assert len(second.json()) == 8
        assert {r["blood_group"] for r in second.json()} == set(BLOOD_GROUPS_EXPECTED)
    finally:
        _reset_auth()


def test_inventory_bootstrap_survives_a_lost_insert_race(api_client):
    """Simulates the loser of the race: rows appear between our read and write."""
    from backend.services.blood_bank_service import BloodBankService

    db = SessionLocal()
    try:
        bank = _org(db, "inv_bank2@example.com", "BLOOD_BANK", "Race Bank")
        # a competing session has already created every row
        session_a = SessionLocal()
        BloodBankService.get_inventory(session_a, bank.id)
        session_a.close()

        # our session still holds a stale, empty view and tries to create them
        session_b = SessionLocal()
        rows = BloodBankService.get_inventory(session_b, bank.id)
        assert len(rows) == 8
        row = BloodBankService._get_or_create_inventory_row(session_b, bank.id, "O+")
        assert row.blood_group == "O+"
        session_b.close()
    finally:
        db.close()


def test_setting_inventory_still_works_after_bootstrap(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "inv_bank3@example.com", "BLOOD_BANK", "Setting Bank")
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        api_client.get("/api/v1/blood-bank/inventory")
        res = api_client.put("/api/v1/blood-bank/inventory/O%2B", json={"units_available": 7})
        assert res.status_code == 200
        assert res.json()["units_available"] == 7
        rows = api_client.get("/api/v1/blood-bank/inventory").json()
        assert next(r for r in rows if r["blood_group"] == "O+")["units_available"] == 7
        assert len(rows) == 8
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# The hospital must be able to see what happens after it forwards a request.
# --------------------------------------------------------------------------

def test_hospital_sees_the_blood_bank_handling_its_request(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "vis_bank1@example.com", "BLOOD_BANK", "Visible Bank")
        hospital = _org(db, "vis_hosp1@example.com", "HOSPITAL", "Visible Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        user = _user(db, "vis_u1@example.com")
        req_id = _request(db, user.id, hospital.id, "READY_FOR_DISPATCH").id
        _fulfillment(db, req_id, bank.id, kind="DIRECT")
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        res = api_client.get("/api/v1/hospital/blood-requests")
        assert res.status_code == 200
        row = next(r for r in res.json() if r["id"] == req_id)
        assert row["assigned_blood_bank"]["org_name"] == "Visible Bank"
        assert row["assigned_blood_bank"]["poc_contact"] == "9000000000"
        assert row["fulfillment_type"] == "DIRECT"
    finally:
        _reset_auth()


def test_hospital_sees_donor_traction_on_a_published_request(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "vis_bank2@example.com", "BLOOD_BANK", "Community Bank")
        hospital = _org(db, "vis_hosp2@example.com", "HOSPITAL", "Community Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        donor_a = _user(db, "vis_u2@example.com")
        donor_b = _user(db, "vis_u3@example.com")
        req_id = _request(db, donor_a.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id, kind="COMMUNITY")
        db.add(CommunityResponse(request_id=req_id, responder_type="DONOR",
                                 donor_id=donor_a.id, status="ACCEPTED"))
        db.add(CommunityResponse(request_id=req_id, responder_type="DONOR",
                                 donor_id=donor_b.id, status="BLOOD_COLLECTED"))
        db.commit()
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        row = next(r for r in api_client.get("/api/v1/hospital/blood-requests").json()
                   if r["id"] == req_id)
        assert row["fulfillment_type"] == "COMMUNITY"
        assert row["responder_count"] == 2
        assert row["collected_count"] == 1
    finally:
        _reset_auth()


def test_requester_also_sees_donor_traction(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "vis_hosp3@example.com", "HOSPITAL", "Requester Hospital")
        bank = _org(db, "vis_bank3@example.com", "BLOOD_BANK", "Requester Bank")
        _link(db, hospital.id, bank.id, "APPROVED")
        user = _user(db, "vis_u4@example.com")
        req_id = _request(db, user.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id, kind="COMMUNITY")
        db.add(CommunityResponse(request_id=req_id, responder_type="NGO",
                                 ngo_id=bank.id, status="ACCEPTED"))
        db.commit()
    finally:
        db.close()

    _as("user", user)
    try:
        row = api_client.get(f"/api/v1/blood-requests/{req_id}").json()
        assert row["responder_count"] == 1
        assert row["collected_count"] == 0
        assert row["assigned_blood_bank"]["org_name"] == "Requester Bank"
    finally:
        _reset_auth()


def test_counts_are_zero_before_a_request_is_forwarded(api_client):
    db = SessionLocal()
    try:
        hospital = _org(db, "vis_hosp4@example.com", "HOSPITAL", "Fresh Hospital")
        user = _user(db, "vis_u5@example.com")
        req_id = _request(db, user.id, hospital.id, "PENDING").id
    finally:
        db.close()

    _as("hospital", hospital)
    try:
        row = next(r for r in api_client.get("/api/v1/hospital/blood-requests").json()
                   if r["id"] == req_id)
        assert row["assigned_blood_bank"] is None
        assert row["fulfillment_type"] is None
        assert row["responder_count"] == 0
        assert row["collected_count"] == 0
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# Locations everywhere: organizations and users can carry a map pin, and it
# reaches every screen that shows an address.
# --------------------------------------------------------------------------

def test_org_registers_with_coordinates(api_client):
    res = api_client.post("/api/v1/auth/org/register", json={
        "org_name": "Pinned Blood Bank", "org_type": "BLOOD_BANK",
        "poc_name": "Dr. Pin", "poc_contact": "9000000000",
        "email": "pinned_bank@example.com", "registration_number_hrf_id": "HRF-PIN-1",
        "address": "RIMS Campus, Ranchi", "password": "TestPass123!",
        "latitude": 23.362148, "longitude": 85.334153,
    })
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["latitude"] == 23.362148
    assert body["longitude"] == 85.334153


def test_org_registration_without_coordinates_still_works(api_client):
    """Coordinates are additive — a plain address must remain valid."""
    res = api_client.post("/api/v1/auth/org/register", json={
        "org_name": "Unpinned NGO", "org_type": "NGO",
        "poc_name": "Dr. NoPin", "poc_contact": "9000000001",
        "email": "unpinned_ngo@example.com", "registration_number_hrf_id": "HRF-PIN-2",
        "address": "Somewhere Lane", "password": "TestPass123!",
    })
    assert res.status_code == 201, res.text
    assert res.json()["latitude"] is None
    assert res.json()["longitude"] is None


def test_org_can_pin_its_address_from_the_profile():
    """Exercises the update service directly: the auth override cannot hand the
    endpoint a row bound to the request's own session."""
    from backend.schemas.organization import OrganizationUpdate
    from backend.services.organization_service import OrganizationService

    db = SessionLocal()
    try:
        created = _org(db, "pin_profile@example.com", "BLOOD_BANK", "Profile Pin Bank")
        row = db.query(Organization).filter(Organization.id == created.id).first()
        assert row.latitude is None

        updated = OrganizationService.update_org_profile(
            db, row,
            OrganizationUpdate(address="Main Road, Ranchi", latitude=23.3441, longitude=85.3096),
        )
        assert float(updated.latitude) == 23.3441
        assert float(updated.longitude) == 85.3096
        assert updated.address == "Main Road, Ranchi"
    finally:
        db.close()

    # and it is persisted, not just set on the instance
    db = SessionLocal()
    try:
        row = db.query(Organization).filter(Organization.email == "pin_profile@example.com").first()
        assert float(row.latitude) == 23.3441
    finally:
        db.close()


def test_donor_sees_the_collection_centre_pin(api_client):
    """The pin has to survive into the embedded brief, or the donor's map is blank."""
    db = SessionLocal()
    try:
        bank = _org(db, "pin_centre@example.com", "BLOOD_BANK", "Pinned Centre")
        hospital = _org(db, "pin_hosp@example.com", "HOSPITAL", "Pinned Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        row = db.query(Organization).filter(Organization.id == bank.id).first()
        row.latitude, row.longitude = 23.362148, 85.334153
        hrow = db.query(Organization).filter(Organization.id == hospital.id).first()
        hrow.latitude, hrow.longitude = 23.3441, 85.3096
        db.commit()
        donor = _user(db, "pin_donor@example.com")
        req_id = _request(db, donor.id, hospital.id, "OPEN").id
        _fulfillment(db, req_id, bank.id)
    finally:
        db.close()

    _as("user", donor)
    try:
        row = next(r for r in api_client.get("/api/v1/users/published-requests").json()
                   if r["id"] == req_id)
        assert row["assigned_blood_bank"]["latitude"] == 23.362148
        assert row["assigned_blood_bank"]["longitude"] == 85.334153
        assert row["hospital"]["latitude"] == 23.3441

        detail = api_client.get(f"/api/v1/blood-requests/{req_id}").json()
        assert detail["assigned_blood_bank"]["longitude"] == 85.334153
    finally:
        _reset_auth()


def test_user_registers_with_a_home_pin(api_client):
    res = api_client.post("/api/v1/auth/register", json={
        "full_name": "Pinned Donor", "dob": "1995-01-01", "blood_group": "O+",
        "phone_number": "9123456780", "email": "pinned_user@example.com",
        "address": "9 Circular Road, Ranchi", "password": "TestPass123!",
        "aadhaar_number_redacted": "XXXX-XXXX-1111",
        "current_lat": 23.3441, "current_lng": 85.3096,
    })
    assert res.status_code == 201, res.text
    assert float(res.json()["current_lat"]) == 23.3441
    assert float(res.json()["current_lng"]) == 85.3096


def test_user_can_pin_their_address_from_the_profile():
    from backend.schemas.user import UserUpdate
    from backend.services.user_service import UserService

    db = SessionLocal()
    try:
        created = _user(db, "pin_profile_user@example.com")
        row = db.query(User).filter(User.id == created.id).first()

        updated = UserService.update_user_profile(
            db, row,
            UserUpdate(address="12 Kanke Road, Ranchi", current_lat=23.4, current_lng=85.31),
        )
        assert float(updated.current_lat) == 23.4
        assert float(updated.current_lng) == 85.31
        assert updated.address == "12 Kanke Road, Ranchi"
    finally:
        db.close()

    db = SessionLocal()
    try:
        row = db.query(User).filter(User.email == "pin_profile_user@example.com").first()
        assert float(row.current_lat) == 23.4
    finally:
        db.close()


def test_linked_hospital_brief_carries_its_pin(api_client):
    db = SessionLocal()
    try:
        bank = _org(db, "pin_bank_link@example.com", "BLOOD_BANK", "Linking Bank")
        hospital = _org(db, "pin_hosp_link@example.com", "HOSPITAL", "Linked Pinned Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        row = db.query(Organization).filter(Organization.id == hospital.id).first()
        row.latitude, row.longitude = 19.076, 72.8777
        db.commit()
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        rows = api_client.get("/api/v1/blood-bank/linked-hospitals").json()
        h = next(r for r in rows if r["id"] == hospital.id)
        assert h["latitude"] == 19.076
        assert h["longitude"] == 72.8777
    finally:
        _reset_auth()


# --------------------------------------------------------------------------
# A walk-in donor (someone who saw a shared request) tops up stock, so an
# already-published request can be fulfilled directly and the appeal closed.
# --------------------------------------------------------------------------

def _open_request_with_volunteer(db, prefix, units=2, group="AB-"):
    bank = _org(db, f"{prefix}_bank@example.com", "BLOOD_BANK", f"{prefix} Bank")
    hospital = _org(db, f"{prefix}_hosp@example.com", "HOSPITAL", f"{prefix} Hospital")
    _link(db, hospital.id, bank.id, "APPROVED")
    patient = _user(db, f"{prefix}_pat@example.com")
    volunteer = _user(db, f"{prefix}_vol@example.com")
    req = BloodRequest(
        requester_id=patient.id, patient_name="Kavya", blood_group_required=group,
        units_required=units, hospital_id=hospital.id, priority="EMERGENCY", status="OPEN",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    _fulfillment(db, req.id, bank.id, kind="COMMUNITY")
    db.add(CommunityResponse(
        request_id=req.id, responder_type="DONOR", donor_id=volunteer.id, status="ACCEPTED"
    ))
    db.commit()
    return bank, req.id, volunteer


def test_open_request_can_be_fulfilled_after_stock_is_topped_up(api_client):
    db = SessionLocal()
    try:
        bank, req_id, volunteer = _open_request_with_volunteer(db, "walkin")
        # the walk-in donation the blood bank just logged into inventory
        db.add(BloodInventory(blood_bank_id=bank.id, blood_group="AB-", units_available=5))
        db.commit()
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        res = api_client.patch(f"/api/v1/blood-bank/requests/{req_id}/fulfill")
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "READY_FOR_DISPATCH"
        assert res.json()["fulfillment_type"] == "DIRECT"

        rows = api_client.get("/api/v1/blood-bank/inventory").json()
        assert next(r for r in rows if r["blood_group"] == "AB-")["units_available"] == 3
    finally:
        _reset_auth()

    db = SessionLocal()
    try:
        response = db.query(CommunityResponse).filter(
            CommunityResponse.request_id == req_id
        ).first()
        assert response.status == "NOT_NEEDED"
    finally:
        db.close()

    _as("user", volunteer)
    try:
        notes = api_client.get("/api/v1/notifications").json()
        stand_down = [n for n in notes if n["title"] == "Donation No Longer Needed"]
        assert stand_down, [n["title"] for n in notes]
        assert "no longer need to come in" in stand_down[0]["message"]
    finally:
        _reset_auth()


def test_open_request_still_short_reports_the_shortfall(api_client):
    db = SessionLocal()
    try:
        bank, req_id, _ = _open_request_with_volunteer(db, "short", units=4)
        db.add(BloodInventory(blood_bank_id=bank.id, blood_group="AB-", units_available=1))
        db.commit()
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        res = api_client.patch(f"/api/v1/blood-bank/requests/{req_id}/fulfill")
        assert res.status_code == 409, res.text
        detail = res.json()["detail"]
        assert "Still short on AB-" in detail
        assert "1 unit(s) in stock, 4 needed" in detail
        # and it must stay published, not silently change state
        assert api_client.get("/api/v1/blood-bank/incoming-requests").json()
    finally:
        _reset_auth()

    db = SessionLocal()
    try:
        req = db.query(BloodRequest).filter(BloodRequest.id == req_id).first()
        assert req.status == "OPEN"
        response = db.query(CommunityResponse).filter(
            CommunityResponse.request_id == req_id
        ).first()
        assert response.status == "ACCEPTED"
    finally:
        db.close()


def test_donor_who_already_gave_is_not_marked_not_needed(api_client):
    """Only outstanding commitments are stood down; a real donation stands."""
    db = SessionLocal()
    try:
        bank, req_id, _ = _open_request_with_volunteer(db, "mixed")
        collected_donor = _user(db, "mixed_done@example.com")
        db.add(CommunityResponse(
            request_id=req_id, responder_type="DONOR",
            donor_id=collected_donor.id, status="BLOOD_COLLECTED",
        ))
        db.add(BloodInventory(blood_bank_id=bank.id, blood_group="AB-", units_available=9))
        db.commit()
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        assert api_client.patch(f"/api/v1/blood-bank/requests/{req_id}/fulfill").status_code == 200
    finally:
        _reset_auth()

    db = SessionLocal()
    try:
        statuses = sorted(
            r.status for r in db.query(CommunityResponse).filter(
                CommunityResponse.request_id == req_id
            ).all()
        )
        assert statuses == ["BLOOD_COLLECTED", "NOT_NEEDED"]
    finally:
        db.close()


def test_verified_path_is_unchanged(api_client):
    """The ordinary first check must behave exactly as before."""
    db = SessionLocal()
    try:
        bank = _org(db, "unchanged_bank@example.com", "BLOOD_BANK", "Unchanged Bank")
        hospital = _org(db, "unchanged_hosp@example.com", "HOSPITAL", "Unchanged Hospital")
        _link(db, hospital.id, bank.id, "APPROVED")
        user = _user(db, "unchanged_u@example.com")
        short_id = _request(db, user.id, hospital.id, "VERIFIED", blood_group="B+").id
    finally:
        db.close()

    _as("blood_bank", bank)
    try:
        # no stock -> publishes to the community exactly as before
        res = api_client.patch(f"/api/v1/blood-bank/requests/{short_id}/fulfill")
        assert res.status_code == 200, res.text
        assert res.json()["status"] == "OPEN"
        assert res.json()["fulfillment_type"] == "COMMUNITY"
    finally:
        _reset_auth()
