"""First-run setup: guarantee there is always an admin to log in with.

Deleting the database used to leave nothing to sign in as, so testing from
scratch meant remembering to run a separate seed script. The server now does
this itself on every startup.

    python -m backend.bootstrap           # ensure the admin exists
    python -m backend.bootstrap --reset   # DESTRUCTIVE: wipe all data, keep only the admin
"""
import datetime
import logging
import os
import sys

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from backend.core.db import Base, SessionLocal, engine
from backend.core.models import (
    User, Organization, BloodRequest, RequestFulfillment, CommunityResponse,
    DonationCamp, CampRegistration, Notification, HospitalBloodBankLink, BloodInventory,
)
from backend.core.security import hash_password

logger = logging.getLogger("lifelink")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@test.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "12345678")
ADMIN_NAME = "Platform Admin"

# Migration 0cbc8e1f2486 inserts this placeholder on every fresh database, and
# nobody knows its password. It is seed data, not a real account, so the
# bootstrap clears it out to leave exactly one admin to log in with.
LEGACY_ADMIN_EMAILS = ("admin@lifelink.com", "admin@lifelinkhq.org", "admin@lifelink.test")

# Child rows first so foreign keys never block the delete.
WIPE_ORDER = (
    Notification, CampRegistration, CommunityResponse, RequestFulfillment,
    BloodRequest, DonationCamp, BloodInventory, HospitalBloodBankLink,
    Organization, User,
)


def ensure_admin(db: Session, prune_legacy: bool = False) -> User:
    """Create the admin account only if it is missing.

    Deliberately additive: it never edits or deletes an account that already
    exists. This runs on every startup, so anything destructive here would
    quietly chip away at real data on each restart.

    `prune_legacy` removes the placeholder admins the initial migration seeds.
    Only the explicit CLI passes it — startup never does.
    """
    if prune_legacy:
        for email in LEGACY_ADMIN_EMAILS:
            if email == ADMIN_EMAIL:
                continue
            stale = db.query(User).filter(User.email == email).first()
            if stale:
                db.delete(stale)
        db.commit()

    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if admin:
        return admin

    admin = User(
        full_name=ADMIN_NAME,
        dob=datetime.date(1990, 1, 1),
        blood_group="O+",
        phone_number="9000000000",
        email=ADMIN_EMAIL,
        address="LifeLink HQ",
        password_hash=hash_password(ADMIN_PASSWORD),
        aadhaar_number_redacted="XXXX-XXXX-0000",
        role="admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def ensure_admin_on_startup() -> None:
    """Called from the app's startup hook. Never raises — a failure here must
    not stop the server, it just gets logged."""
    try:
        if not inspect(engine).get_table_names():
            return
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
            if existing:
                return
            ensure_admin(db)
            logger.warning("Created admin login: %s / %s", ADMIN_EMAIL, ADMIN_PASSWORD)
        finally:
            db.close()
    except Exception:
        logger.exception("Could not ensure the admin account exists")


def reset(db: Session) -> None:
    """Delete every record, then recreate the admin."""
    for model in WIPE_ORDER:
        db.query(model).delete()
    db.commit()
    ensure_admin(db, prune_legacy=True)


def main() -> int:
    if not inspect(engine).get_table_names():
        print("Empty database — creating the schema first…")
        from backend.check_db import run_alembic

        run_alembic("upgrade", "head")

    db = SessionLocal()
    try:
        if "--reset" in sys.argv:
            print("Deleting all data…")
            reset(db)
            print("All data removed.")
        else:
            ensure_admin(db, prune_legacy=True)

        print(f"Admin login: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        for model in WIPE_ORDER:
            print(f"  {model.__tablename__}: {db.query(model).count()}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
