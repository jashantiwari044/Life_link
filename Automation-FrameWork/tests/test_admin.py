from datetime import datetime

from fastapi import HTTPException

from backend.api.v1 import admin as admin_routes


def test_get_pending_organizations(api_client, monkeypatch):
    fake_orgs = [
        {
            "id": 1,
            "org_name": "City Hospital",
            "org_type": "HOSPITAL",
            "poc_name": "Dr. Smith",
            "poc_contact": "9999999999",
            "email": "city@example.com",
            "registration_number_hrf_id": "HRF001",
            "address": "New York",
            "supporting_docs_url": None,
            "approval_status": "PENDING",
            "created_at": datetime(2026, 7, 31, 12, 0, 0),
        }
    ]

    def fake_list_pending_orgs(db):
        return fake_orgs

    monkeypatch.setattr(
        admin_routes.AdminService,
        "list_pending_orgs",
        fake_list_pending_orgs,
    )

    response = api_client.get("/api/v1/admin/org-approvals")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["approval_status"] == "PENDING"


def test_approve_organization(api_client, monkeypatch):
    fake_org = {
        "id": 1,
        "org_name": "City Hospital",
        "org_type": "HOSPITAL",
        "poc_name": "Dr. Smith",
        "poc_contact": "9999999999",
        "email": "city@example.com",
        "registration_number_hrf_id": "HRF001",
        "address": "New York",
        "supporting_docs_url": None,
        "approval_status": "APPROVED",
        "created_at": datetime(2026, 7, 31, 12, 0, 0),
    }

    def fake_approve_reject_org(db, org_id, approve, rejection_reason):
        return fake_org

    monkeypatch.setattr(
        admin_routes.AdminService,
        "approve_reject_org",
        fake_approve_reject_org,
    )

    response = api_client.patch(
        "/api/v1/admin/org-approvals/1",
        json={"approve": True},
    )

    print(response.json())

    assert response.status_code == 200
    assert response.json()["approval_status"] == "APPROVED"


def test_reject_organization(api_client, monkeypatch):
    fake_org = {
        "id": 1,
        "org_name": "City Hospital",
        "org_type": "HOSPITAL",
        "poc_name": "Dr. Smith",
        "poc_contact": "9999999999",
        "email": "city@example.com",
        "registration_number_hrf_id": "HRF001",
        "address": "New York",
        "supporting_docs_url": None,
        "approval_status": "REJECTED",
        "created_at": datetime(2026, 7, 31, 12, 0, 0),
    }

    def fake_approve_reject_org(db, org_id, approve, rejection_reason):
        return fake_org

    monkeypatch.setattr(
        admin_routes.AdminService,
        "approve_reject_org",
        fake_approve_reject_org,
    )

    response = api_client.patch(
        "/api/v1/admin/org-approvals/1",
        json={
            "approve": False,
            "rejection_reason": "Invalid registration documents",
        },
    )

    assert response.status_code == 200
    assert response.json()["approval_status"] == "REJECTED"


def test_approve_organization_not_found(api_client, monkeypatch):
    def fake_approve_reject_org(db, org_id, approve, rejection_reason):
        raise HTTPException(status_code=404, detail="Organization not found")

    monkeypatch.setattr(
        admin_routes.AdminService,
        "approve_reject_org",
        fake_approve_reject_org,
    )

    response = api_client.patch(
        "/api/v1/admin/org-approvals/999",
        json={"approve": True},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Organization not found"


def test_list_users(api_client, monkeypatch):
    fake_users = [
        {
            "id": 1,
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone_number": "9999999999",
            "dob": "1990-01-01",
            "blood_group": "A+",
            "address": "123 Main Street",
            "aadhaar_number_redacted": "XXXX-XXXX-1234",
            "donor_mode_enabled": False,
            "last_donation_date": None,
            "current_lat": None,
            "current_lng": None,
            "created_at": "2026-07-31T12:00:00",
        }
    ]

    def fake_list_all_users(db, skip, limit):
        return fake_users

    monkeypatch.setattr(
        admin_routes.AdminService,
        "list_all_users",
        fake_list_all_users,
    )

    response = api_client.get("/api/v1/admin/users")

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["email"] == "john@example.com"


def test_get_user_detail(api_client, monkeypatch):
    fake_user = {
        "id": 1,
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone_number": "9999999999",
        "dob": "1990-01-01",
        "blood_group": "A+",
        "address": "123 Main Street",
        "aadhaar_number_redacted": "XXXX-XXXX-1234",
        "donor_mode_enabled": False,
        "last_donation_date": None,
        "current_lat": None,
        "current_lng": None,
        "created_at": "2026-07-31T12:00:00",
    }

    def fake_get_user_detail(db, user_id):
        return fake_user

    monkeypatch.setattr(
        admin_routes.AdminService,
        "get_user_detail",
        fake_get_user_detail,
    )

    response = api_client.get("/api/v1/admin/users/1")

    assert response.status_code == 200
    assert response.json()["id"] == 1
    assert response.json()["email"] == "john@example.com"


def test_get_user_detail_not_found(api_client, monkeypatch):
    def fake_get_user_detail(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    monkeypatch.setattr(
        admin_routes.AdminService,
        "get_user_detail",
        fake_get_user_detail,
    )

    response = api_client.get("/api/v1/admin/users/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_get_platform_stats(api_client, monkeypatch):
    fake_stats = {
        "users_count": 150,
        "organizations_count": 12,
        "requests_fulfilled_count": 65,
        "camps_run_count": 8,
    }

    def fake_get_platform_stats(db):
        return fake_stats

    monkeypatch.setattr(
        admin_routes.AdminService,
        "get_platform_stats",
        fake_get_platform_stats,
    )

    response = api_client.get("/api/v1/admin/stats")

    assert response.status_code == 200
    assert response.json()["users_count"] == 150
    assert response.json()["organizations_count"] == 12
    assert response.json()["requests_fulfilled_count"] == 65
    assert response.json()["camps_run_count"] == 8


import pytest
from types import SimpleNamespace

from backend.core.security import get_current_user
from backend.main import app


def _set_admin_override(role: str, user_id: int = 1):
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=user_id, role=role)


def _clear_admin_override():
    app.dependency_overrides.pop(get_current_user, None)


def test_admin_users_forbidden_for_non_admin(api_client):
    _set_admin_override("user", user_id=99)
    try:
        response = api_client.get("/api/v1/admin/users")
        assert response.status_code == 403
        assert "admin" in response.json()["detail"]
    finally:
        _clear_admin_override()


def test_admin_org_approvals_forbidden_for_non_admin(api_client):
    _set_admin_override("hospital", user_id=77)
    try:
        response = api_client.get("/api/v1/admin/org-approvals")
        assert response.status_code == 403
    finally:
        _clear_admin_override()


def test_admin_user_detail_not_found(api_client, monkeypatch):
    def fake_get_user_detail(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")

    monkeypatch.setattr(
        admin_routes.AdminService,
        "get_user_detail",
        fake_get_user_detail,
    )

    response = api_client.get("/api/v1/admin/users/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


@pytest.mark.parametrize(
    "payload",
    [
        {"approve": True, "rejection_reason": "irrelevant"},
        {"approve": False},
    ],
)
def test_admin_org_approval_payload_variants(api_client, monkeypatch, payload):
    fake_org = {
        "id": 1,
        "org_name": "City Hospital",
        "org_type": "HOSPITAL",
        "poc_name": "Dr. Smith",
        "poc_contact": "9999999999",
        "email": "city@example.com",
        "registration_number_hrf_id": "HRF001",
        "address": "New York",
        "supporting_docs_url": None,
        "approval_status": "APPROVED" if payload["approve"] else "REJECTED",
        "created_at": datetime(2026, 7, 31, 12, 0, 0),
    }

    def fake_approve_reject_org(db, org_id, approve, rejection_reason):
        return fake_org

    monkeypatch.setattr(
        admin_routes.AdminService,
        "approve_reject_org",
        fake_approve_reject_org,
    )

    response = api_client.patch("/api/v1/admin/org-approvals/1", json=payload)

    assert response.status_code == 200
    assert response.json()["approval_status"] == fake_org["approval_status"]