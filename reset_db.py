import sys
import datetime
sys.path.insert(0, '.')
from backend.core.db import engine, Base, SessionLocal
from backend.core.models import User, Organization
from backend.core.security import hash_password

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()
pwd = hash_password("12345678")

print("Seeding Admin...")
admin = User(
    full_name="System Admin", email="admin@test.com", password_hash=pwd,
    phone_number="9000000000", role="admin", blood_group="O+",
    dob=datetime.date(1990, 1, 1), address="Admin St, Delhi", aadhaar_number_redacted="111111111111"
)
db.add(admin)

print("Seeding Normal User...")
user = User(
    full_name="Test User", email="user@test.com", password_hash=pwd,
    phone_number="9000000001", role="user", blood_group="B+",
    dob=datetime.date(2000, 1, 1), address="12 Main St, Delhi", aadhaar_number_redacted="123456789012"
)
db.add(user)

print("Seeding Donor User...")
donor = User(
    full_name="Donor User", email="donor@test.com", password_hash=pwd,
    phone_number="9000000005", role="user", blood_group="B+",
    dob=datetime.date(1995, 6, 15), address="5 Donor St, Delhi", aadhaar_number_redacted="987654321098",
    donor_mode_enabled=True
)
db.add(donor)

print("Seeding Organizations...")
hospital = Organization(
    org_name="Test Hospital", org_type="HOSPITAL", email="hospital@test.com", password_hash=pwd,
    poc_name="Dr Sharma", poc_contact="9000000002", registration_number_hrf_id="HRF-HOSP-001",
    address="15 Hospital Rd, Delhi", approval_status="PENDING"
)
db.add(hospital)

blood_bank = Organization(
    org_name="Test Blood Bank", org_type="BLOOD_BANK", email="bloodbank@test.com", password_hash=pwd,
    poc_name="Mr Kapoor", poc_contact="9000000003", registration_number_hrf_id="HRF-BB-001",
    address="8 Bank Lane, Delhi", approval_status="PENDING"
)
db.add(blood_bank)

ngo = Organization(
    org_name="Test NGO", org_type="NGO", email="ngo@test.com", password_hash=pwd,
    poc_name="Ms Priya", poc_contact="9000000004", registration_number_hrf_id="HRF-NGO-001",
    address="3 NGO Colony, Delhi", approval_status="PENDING"
)
db.add(ngo)

db.commit()
print("✅ All users and organizations seeded successfully.")
db.close()
