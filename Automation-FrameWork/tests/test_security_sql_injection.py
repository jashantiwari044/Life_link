import sqlite3
from pathlib import Path
import json


REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_DB = REPO_ROOT / "backend" / "test_healthcare.db"


def _table_exists(conn, name: str) -> bool:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cur.fetchone() is not None


def test_sql_injection_in_blood_request_patient_name(api_client):
    malicious_name = "'; DROP TABLE users; --"
    payload = {
        "patient_name": malicious_name,
        "blood_group_required": "O+",
        "units_required": 1,
        "priority": "EMERGENCY"
    }

    resp = api_client.post("/api/v1/blood-requests", json=payload)

    print(resp.json())

    assert resp.status_code in (201, 200, 422)

    conn = sqlite3.connect(TEST_DB.as_posix())
    try:
        assert _table_exists(conn, "users")
        assert _table_exists(conn, "blood_requests")
    finally:
        conn.close()


def test_sql_injection_login_identifier(api_client):
    # classic SQL injection attempt for login identifier
    inj = "' OR '1'='1"
    resp = api_client.post("/api/v1/auth/login", json={"identifier": inj, "password": "x"})
    assert resp.status_code == 401
    print(resp.json())
    # db intact
    conn = sqlite3.connect(TEST_DB.as_posix())
    try:
        assert _table_exists(conn, "users")
    finally:
        conn.close()


def test_path_param_injection_returns_422(api_client):
    # path expects int; non-int injection should be rejected with validation error
    resp = api_client.get("/api/v1/blood-requests/1;DROP TABLE users")
    assert resp.status_code == 422


def test_sql_injection_in_user_register_full_name(api_client):
    malicious_name = "Robert'); DROP TABLE users; --"
    payload = {
        "full_name": malicious_name,
        "dob": "1995-05-12",
        "blood_group": "O+",
        "phone_number": "9876543210",
        "email": "security.user@example.com",
        "address": "123 Main Street",
        "aadhaar_number_redacted": "XXXX-XXXX-1234",
        "donor_mode_enabled": True,
        "password": "Password123!",
    }

    resp = api_client.post("/api/v1/auth/register", json=payload)

    assert resp.status_code == 201

    conn = sqlite3.connect(TEST_DB.as_posix())
    try:
        assert _table_exists(conn, "users")
        assert _table_exists(conn, "organizations")
    finally:
        conn.close()


def test_sql_injection_in_org_register_name(api_client):
    malicious_org_name = "City Hospital'); DROP TABLE organizations; --"
    payload = {
        "org_name": malicious_org_name,
        "org_type": "HOSPITAL",
        "poc_name": "Dr. Smith",
        "poc_contact": "9999999999",
        "email": "security.org@example.com",
        "registration_number_hrf_id": "HRF-9001",
        "address": "1 Health Avenue",
        "password": "Password123!",
    }

    resp = api_client.post("/api/v1/auth/org/register", json=payload)

    assert resp.status_code == 201

    conn = sqlite3.connect(TEST_DB.as_posix())
    try:
        assert _table_exists(conn, "users")
        assert _table_exists(conn, "organizations")
    finally:
        conn.close()


def test_sql_injection_in_org_login_identifier(api_client):
    inj = "' OR '1'='1"
    resp = api_client.post("/api/v1/auth/org/login", json={"identifier": inj, "password": "x"})
    assert resp.status_code == 401

    conn = sqlite3.connect(TEST_DB.as_posix())
    try:
        assert _table_exists(conn, "users")
        assert _table_exists(conn, "organizations")
    finally:
        conn.close()


def test_sql_injection_path_param_with_extra_segment(api_client):
    resp = api_client.delete("/api/v1/blood-requests/2/../../users")
    assert resp.status_code == 404
