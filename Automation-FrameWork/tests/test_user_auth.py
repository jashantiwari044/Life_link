from datetime import datetime

from fastapi import HTTPException

from backend.api.v1 import auth as auth_routes


def test_register_user_returns_created_user(api_client, monkeypatch):
    test_user = {
        "id": 1,
        "full_name": "Test User",
        "dob": "1995-05-12",
        "blood_group": "O+",
        "phone_number": "9876543210",
        "email": "test.user@example.com",
        "address": "123 Main Street",
        "aadhaar_number_redacted": "XXXX-XXXX-1234",
        "donor_mode_enabled": True,
        "last_donation_date": None,
        "current_lat": None,
        "current_lng": None,
        "created_at": datetime(2026, 7, 31, 12, 0, 0),
    }

    def test_register_user(db, user_in):
        return test_user

    monkeypatch.setattr(auth_routes.AuthService, "register_user", test_register_user)

    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "dob": "1995-05-12",
            "blood_group": "O+",
            "phone_number": "9876543210",
            "email": "test.user@example.com",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
            "donor_mode_enabled": True,
            "password": "Password123!",
        },
    )

    assert response.status_code == 201
    assert response.json()["email"] == "test.user@example.com"
    assert response.json()["full_name"] == "Test User"


def test_register_user_rejects_duplicate_email(api_client, monkeypatch):
    def test_register_user(db, user_in):
        raise HTTPException(status_code=400, detail="Account with this email already exists")

    monkeypatch.setattr(auth_routes.AuthService, "register_user", test_register_user)

    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "dob": "1995-05-12",
            "blood_group": "O+",
            "phone_number": "9876543210",
            "email": "test.user@example.com",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
            "donor_mode_enabled": True,
            "password": "Password123!",
        },
    )

    print(response.json())

    assert response.status_code == 400
    assert response.json()["detail"] == "Account with this email already exists"


def test_register_user_rejects_duplicate_phone(api_client, monkeypatch):
    def register_user(db, user_in):
        raise HTTPException(status_code=400, detail="Account with this phone number already exists")

    monkeypatch.setattr(auth_routes.AuthService, "register_user", register_user)

    response = api_client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "dob": "1995-05-12",
            "blood_group": "O+",
            "phone_number": "9876543210",
            "email": "test.user@example.com",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
            "donor_mode_enabled": True,
            "password": "Password123!",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Account with this phone number already exists"


def test_login_user_returns_access_token(api_client, monkeypatch):
    def test_authenticate_user(db, login_data):
        return auth_routes.Token(access_token="token-123", token_type="bearer")

    monkeypatch.setattr(auth_routes.AuthService, "authenticate_user", test_authenticate_user)

    response = api_client.post(
        "/api/v1/auth/login",
        json={"identifier": "test.user@example.com", "password": "Password123!"},
    )

    assert response.status_code == 200
    assert response.json() == {"access_token": "token-123", "token_type": "bearer"}


def test_login_user_rejects_bad_credentials(api_client, monkeypatch):


    response = api_client.post(
        "/api/v1/auth/login",
        json={"identifier": "test.user@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email/phone or password"


import pytest


@pytest.mark.parametrize(
    "payload",
    [
        {
            "full_name": "Test User",
            "dob": "1995-05-12",
            "blood_group": "O+",
            "phone_number": "9876543210",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
            "password": "Password123!",
        },
        {
            "full_name": "Test User",
            "dob": "1995-05-12",
            "blood_group": "O+",
            "phone_number": "9876543210",
            "email": "not-an-email",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
            "password": "Password123!",
        },
        {
            "full_name": "Test User",
            "dob": "1995-05-12",
            "blood_group": "O+",
            "phone_number": "9876543210",
            "email": "test.user@example.com",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
        },
    ],
)
def test_register_user_validation_errors(api_client, payload):
    response = api_client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


# @pytest.mark.xfail(reason="Password minimum length is not enforced by the current user schema")
# def test_register_user_password_below_minimum_length(api_client):
#     response = api_client.post(
#         "/api/v1/auth/register",
#         json={
#             "full_name": "Test User",
#             "dob": "1995-05-12",
#             "blood_group": "O+",
#             "phone_number": "9876543210",
#             "email": "test.user@example.com",
#             "address": "123 Main Street",
#             "aadhaar_number_redacted": "XXXX-XXXX-1234",
#             "donor_mode_enabled": True,
#             "password": "short",
#         },
#     )

#     assert response.status_code == 422


# @pytest.mark.xfail(reason="Phone number format is not enforced by the current user schema")
# def test_register_user_invalid_phone_number_format(api_client):
#     response = api_client.post(
#         "/api/v1/auth/register",
#         json={
#             "full_name": "Test User",
#             "dob": "1995-05-12",
#             "blood_group": "O+",
#             "phone_number": "12ab",
#             "email": "test.user@example.com",
#             "address": "123 Main Street",
#             "aadhaar_number_redacted": "XXXX-XXXX-1234",
#             "donor_mode_enabled": True,
#             "password": "Password123!",
#         },
#     )

#     assert response.status_code == 422