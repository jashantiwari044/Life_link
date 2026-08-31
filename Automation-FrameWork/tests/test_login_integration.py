import datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.models import User, Organization
from backend.core.security import hash_password


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"
ENGINE = create_engine(f"sqlite:///{TEST_DB.as_posix()}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)


def create_user(email="login.test@example.com", password="Password123!"):
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == email).first()
        if u:
            return u
        u = User(
            full_name="Login Test",
            dob=datetime.date(1990, 1, 1),
            blood_group="O+",
            phone_number="0000000000",
            email=email,
            address="addr",
            password_hash=hash_password(password),
            aadhaar_number_redacted="xx",
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u
    finally:
        db.close()


def create_org(email="org.login@example.com", password="OrgPass123!", org_type="HOSPITAL", approved=True):
    db = SessionLocal()
    try:
        o = db.query(Organization).filter(Organization.email == email).first()
        if o:
            return o
        o = Organization(
            org_name="LoginOrg",
            org_type=org_type,
            poc_name="p",
            poc_contact="c",
            email=email,
            registration_number_hrf_id=email,
            address="addr",
            password_hash=hash_password(password),
            approval_status="APPROVED" if approved else "PENDING",
        )
        db.add(o)
        db.commit()
        db.refresh(o)
        return o
    finally:
        db.close()


def test_user_login_success(api_client):
    email = "login.success@example.com"
    pwd = "Secret123!"
    create_user(email=email, password=pwd)

    resp = api_client.post("/api/v1/auth/login", json={"identifier": email, "password": pwd})
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("access_token")
    assert data.get("token_type") == "bearer"


def test_user_login_wrong_password(api_client):
    email = "login.wrongpwd@example.com"
    create_user(email=email, password="RightPass1")
    resp = api_client.post("/api/v1/auth/login", json={"identifier": email, "password": "WrongPass"})
    assert resp.status_code == 401


def test_user_login_nonexistent(api_client):
    resp = api_client.post("/api/v1/auth/login", json={"identifier": "no.such@example.com", "password": "x"})
    assert resp.status_code == 401


def test_org_login_success(api_client):
    email = "org.login.success@example.com"
    pwd = "OrgSecret1!"
    create_org(email=email, password=pwd, org_type="BLOOD_BANK", approved=True)
    resp = api_client.post("/api/v1/auth/org/login", json={"identifier": email, "password": pwd})
    assert resp.status_code == 200
    assert resp.json().get("access_token")


def test_org_login_pending_forbidden(api_client):
    email = "org.login.pending@example.com"
    pwd = "OrgPending1!"
    create_org(email=email, password=pwd, org_type="HOSPITAL", approved=False)
    resp = api_client.post("/api/v1/auth/org/login", json={"identifier": email, "password": pwd})
    assert resp.status_code == 403


def test_tc36_user_login_missing_identifier(api_client):
    resp = api_client.post("/api/v1/auth/login", json={"password": "Password123!"})
    assert resp.status_code == 422


def test_tc37_user_login_missing_password(api_client):
    resp = api_client.post("/api/v1/auth/login", json={"identifier": "login.success@example.com"})
    assert resp.status_code == 422


def test_tc38_user_login_empty_request_body(api_client):
    resp = api_client.post("/api/v1/auth/login", json={})
    assert resp.status_code == 422


def test_tc41_org_login_nonexistent_organization(api_client):
    resp = api_client.post(
        "/api/v1/auth/org/login",
        json={"identifier": "missing.org@example.com", "password": "Password123!"},
    )
    assert resp.status_code == 401


def test_tc42_org_login_empty_credentials(api_client):
    resp = api_client.post(
        "/api/v1/auth/org/login",
        json={"identifier": "", "password": ""},
    )
    print(resp.json())
    assert resp.status_code == 401
