import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date,
    Numeric, Text, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.core.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    dob = Column(Date, nullable=False)
    blood_group = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    address = Column(Text, nullable=False)
    password_hash = Column(String, nullable=False)
    aadhaar_number_redacted = Column(String, nullable=False)
    donor_mode_enabled = Column(Boolean, default=False, nullable=False)
    last_donation_date = Column(Date, nullable=True)
    current_lat = Column(Numeric(10, 8), nullable=True)
    current_lng = Column(Numeric(11, 8), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    role = Column(String, default="user", nullable=False)

    # Relationships
    blood_requests = relationship("BloodRequest", back_populates="requester")
    community_responses = relationship("CommunityResponse", back_populates="donor")
    camp_registrations = relationship("CampRegistration", back_populates="user")
    notifications = relationship("Notification", back_populates="recipient_user")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    org_name = Column(String, nullable=False)
    org_type = Column(String, nullable=False)  # HOSPITAL, BLOOD_BANK, NGO
    poc_name = Column(String, nullable=False)
    poc_contact = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    registration_number_hrf_id = Column(String, unique=True, index=True, nullable=False)
    address = Column(Text, nullable=False)
    supporting_docs_url = Column(String, nullable=True)
    # Pinned location for the address above, so donors and partners get a map
    # and a directions link instead of a bare street address.
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    approval_status = Column(String, default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    hospital_blood_requests = relationship("BloodRequest", back_populates="hospital")
    assigned_fulfillments = relationship("RequestFulfillment", back_populates="assigned_blood_bank")
    ngo_community_responses = relationship("CommunityResponse", back_populates="ngo")
    donation_camps = relationship("DonationCamp", back_populates="ngo")
    notifications = relationship("Notification", back_populates="recipient_org")
    inventory = relationship("BloodInventory", back_populates="blood_bank")
    shortage_alerts = relationship("ShortageAlert", back_populates="blood_bank")


class HospitalBloodBankLink(Base):
    __tablename__ = "hospital_blood_bank_links"
    __table_args__ = (UniqueConstraint("hospital_id", "blood_bank_id", name="uq_hospital_blood_bank"),)

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    blood_bank_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    status = Column(String, default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=True)

    hospital = relationship("Organization", foreign_keys=[hospital_id])
    blood_bank = relationship("Organization", foreign_keys=[blood_bank_id])


class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_name = Column(String, nullable=False)
    blood_group_required = Column(String, nullable=False)
    units_required = Column(Integer, nullable=False)
    hospital_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    priority = Column(String, nullable=False)  # EMERGENCY, URGENT, PLANNED
    emergency_reason = Column(Text, nullable=True)
    status = Column(String, default="PENDING", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    requester = relationship("User", back_populates="blood_requests")
    hospital = relationship("Organization", back_populates="hospital_blood_requests")
    fulfillment = relationship("RequestFulfillment", back_populates="request", uselist=False)
    community_responses = relationship("CommunityResponse", back_populates="request")

    @property
    def assigned_blood_bank(self):
        """The blood bank handling this request.

        This is where a responding donor physically goes to give blood — it is
        the bank that collects and verifies the donation, so it has to be
        surfaced to donors rather than left buried in the fulfillment row.
        """
        if self.fulfillment and self.fulfillment.assigned_blood_bank:
            return self.fulfillment.assigned_blood_bank
        if self.hospital and self.hospital.hospital_links:
            for link in self.hospital.hospital_links:
                if link.status == "APPROVED" and link.blood_bank:
                    return link.blood_bank
        return None

    @property
    def fulfillment_type(self):
        """DIRECT (from bank stock) or COMMUNITY (published to donors)."""
        return self.fulfillment.fulfillment_type if self.fulfillment else None

    @property
    def responder_count(self) -> int:
        """How many donors/NGOs have volunteered. Lets the hospital and the
        requester see that a published request is actually getting traction."""
        return len(self.community_responses)

    @property
    def collected_count(self) -> int:
        """Volunteers whose blood the bank has actually collected."""
        return sum(1 for r in self.community_responses if r.status == "BLOOD_COLLECTED")


class RequestFulfillment(Base):
    __tablename__ = "request_fulfillments"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("blood_requests.id"), nullable=False, unique=True)
    fulfillment_type = Column(String, nullable=False)  # DIRECT, COMMUNITY
    assigned_blood_bank_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=True)

    request = relationship("BloodRequest", back_populates="fulfillment")
    assigned_blood_bank = relationship("Organization", back_populates="assigned_fulfillments")


class BloodInventory(Base):
    __tablename__ = "blood_inventory"
    __table_args__ = (UniqueConstraint("blood_bank_id", "blood_group", name="uq_bloodbank_group"),)

    id = Column(Integer, primary_key=True, index=True)
    blood_bank_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    blood_group = Column(String, nullable=False)  # A+, A-, B+, B-, AB+, AB-, O+, O-
    units_available = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=True)

    blood_bank = relationship("Organization", back_populates="inventory")


class CommunityResponse(Base):
    __tablename__ = "community_responses"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("blood_requests.id"), nullable=False)
    responder_type = Column(String, nullable=False)  # DONOR, NGO
    donor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ngo_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    status = Column(String, nullable=False)  # ACCEPTED, BLOOD_COLLECTED
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    request = relationship("BloodRequest", back_populates="community_responses")
    donor = relationship("User", back_populates="community_responses")
    ngo = relationship("Organization", back_populates="ngo_community_responses")


class DonationCamp(Base):
    __tablename__ = "donation_camps"

    id = Column(Integer, primary_key=True, index=True)
    ngo_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    title = Column(String, nullable=False)
    venue = Column(Text, nullable=False)
    date_time = Column(DateTime, nullable=False)
    contact_info = Column(String, nullable=False)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    status = Column(String, default="ACTIVE", server_default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    ngo = relationship("Organization", back_populates="donation_camps")
    registrations = relationship("CampRegistration", back_populates="camp")


class CampRegistration(Base):
    __tablename__ = "camp_registrations"

    id = Column(Integer, primary_key=True, index=True)
    camp_id = Column(Integer, ForeignKey("donation_camps.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    registered_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    camp = relationship("DonationCamp", back_populates="registrations")
    user = relationship("User", back_populates="camp_registrations")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recipient_org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    recipient_user = relationship("User", back_populates="notifications")
    recipient_org = relationship("Organization", back_populates="notifications")


class ShortageAlert(Base):
    __tablename__ = "shortage_alerts"

    id = Column(Integer, primary_key=True, index=True)
    blood_bank_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    blood_group = Column(String, nullable=False)
    units_needed = Column(Integer, nullable=False)
    urgency = Column(String, default="HIGH", nullable=False)  # MEDIUM, HIGH, CRITICAL
    message = Column(Text, nullable=False)
    status = Column(String, default="ACTIVE", server_default="ACTIVE", nullable=False)  # ACTIVE, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    blood_bank = relationship("Organization", back_populates="shortage_alerts")
