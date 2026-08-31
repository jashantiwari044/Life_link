from datetime import datetime

from fastapi import HTTPException

from backend.api.v1 import auth as auth_routes


def test_register_organization_returns_pending_org(api_client, monkeypatch):
    fake_org = {
        "id": 11,
        "org_name": "City Hospital",
        "org_type": "HOSPITAL",
        "poc_name": "Dr. Smith",
        "poc_contact": "9998887777",
        "email": "hospital@example.com",
        "registration_number_hrf_id": "HRF-1001",
        "address": "1 Health Avenue",
        "supporting_docs_url": None,
        "approval_status": "PENDING",
        "created_at": datetime(2026, 7, 31, 12, 30, 0),
    }

    def fake_register_organization(db, org_in):
        return fake_org

    monkeypatch.setattr(auth_routes.AuthService, "register_organization", fake_register_organization)

    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_name": "City Hospital",
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "hospital@example.com",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
            "password": "Password123!",
        },
    )

    assert response.status_code == 201
    assert response.json()["approval_status"] == "PENDING"
    assert response.json()["email"] == "hospital@example.com"


def test_register_organization_rejects_duplicate_email(api_client, monkeypatch):
    def fake_register_organization(db, org_in):
        raise HTTPException(status_code=400, detail="Organization with this email already exists")

    monkeypatch.setattr(auth_routes.AuthService, "register_organization", fake_register_organization)

    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_name": "City Hospital",
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "hospital@example.com",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
            "password": "Password123!",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Organization with this email already exists"


def test_register_organization_rejects_duplicate_registration_number(api_client, monkeypatch):
    def fake_register_organization(db, org_in):
        raise HTTPException(
            status_code=400,
            detail="Organization with this Registration Number / HRF ID already exists",
        )

    monkeypatch.setattr(auth_routes.AuthService, "register_organization", fake_register_organization)

    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_name": "City Hospital",
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "hospital@example.com",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
            "password": "Password123!",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Organization with this Registration Number / HRF ID already exists"


def test_login_organization_returns_access_token(api_client, monkeypatch):
    def fake_authenticate_organization(db, login_data):
        return auth_routes.Token(access_token="org-token-123", token_type="bearer")

    monkeypatch.setattr(auth_routes.AuthService, "authenticate_organization", fake_authenticate_organization)

    response = api_client.post(
        "/api/v1/auth/org/login",
        json={"identifier": "hospital@example.com", "password": "Password123!"},
    )

    assert response.status_code == 200
    assert response.json() == {"access_token": "org-token-123", "token_type": "bearer"}


def test_login_organization_rejects_bad_password(api_client, monkeypatch):
    def fake_authenticate_organization(db, login_data):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    monkeypatch.setattr(auth_routes.AuthService, "authenticate_organization", fake_authenticate_organization)

    response = api_client.post(
        "/api/v1/auth/org/login",
        json={"identifier": "hospital@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_organization_rejects_unapproved_org(api_client, monkeypatch):
    def fake_authenticate_organization(db, login_data):
        raise HTTPException(status_code=403, detail="Organization approval status is pending or rejected")

    monkeypatch.setattr(auth_routes.AuthService, "authenticate_organization", fake_authenticate_organization)

    response = api_client.post(
        "/api/v1/auth/org/login",
        json={"identifier": "hospital@example.com", "password": "Password123!"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Organization approval status is pending or rejected"


def test_register_organization_missing_org_name(api_client):
    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "hospital@example.com",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
            "password": "Password123!",
        },
    )

    assert response.status_code == 422


def test_register_organization_invalid_email_format(api_client):
    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_name": "City Hospital",
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "not-an-email",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
            "password": "Password123!",
        },
    )

    assert response.status_code == 422


def test_register_organization_missing_password(api_client):
    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_name": "City Hospital",
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "hospital@example.com",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
        },
    )

    assert response.status_code == 422


def test_register_organization_invalid_org_type(api_client):
    response = api_client.post(
        "/api/v1/auth/org/register",
        json={
            "org_name": "City Hospital",
            "org_type": "CLINIC",
            "poc_name": "Dr. Smith",
            "poc_contact": "9998887777",
            "email": "hospital@example.com",
            "registration_number_hrf_id": "HRF-1001",
            "address": "1 Health Avenue",
            "password": "Password123!",
        },
    )

    assert response.status_code == 422


def test_login_organization_missing_identifier(api_client):
    response = api_client.post(
        "/api/v1/auth/org/login",
        json={"password": "Password123!"},
    )

    assert response.status_code == 422


def test_login_organization_missing_password(api_client):
    response = api_client.post(
        "/api/v1/auth/org/login",
        json={"identifier": "hospital@example.com"},
    )

    assert response.status_code == 422


def test_login_organization_empty_body(api_client):
    response = api_client.post("/api/v1/auth/org/login", json={})

    assert response.status_code == 422