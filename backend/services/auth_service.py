from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.core.models import User, Organization
from backend.core.security import hash_password, verify_password, create_access_token
from backend.schemas.auth import Token, LoginRequest
from backend.schemas.user import UserCreate
from backend.schemas.organization import OrganizationCreate


class AuthService:
    @staticmethod
    def register_user(db: Session, user_in: UserCreate) -> User:
        existing = db.query(User).filter(
            or_(User.email == user_in.email, User.phone_number == user_in.phone_number)
        ).first()

        if existing:
            if existing.email == user_in.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Account with this email already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account with this phone number already exists"
            )

        db_user = User(
            full_name=user_in.full_name,
            dob=user_in.dob,
            blood_group=user_in.blood_group,
            phone_number=user_in.phone_number,
            email=user_in.email,
            address=user_in.address,
            password_hash=hash_password(user_in.password),
            aadhaar_number_redacted=user_in.aadhaar_number_redacted,
            donor_mode_enabled=user_in.donor_mode_enabled or False,
            last_donation_date=user_in.last_donation_date,
            current_lat=user_in.current_lat,
            current_lng=user_in.current_lng
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def authenticate_user(db: Session, login_data: LoginRequest) -> Token:
        user = db.query(User).filter(
            or_(User.email == login_data.identifier, User.phone_number == login_data.identifier)
        ).first()

        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email/phone or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        role = user.role
        access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": role})
        return Token(access_token=access_token, token_type="bearer")

    @staticmethod
    def register_organization(db: Session, org_in: OrganizationCreate) -> Organization:
        existing = db.query(Organization).filter(
            or_(
                Organization.email == org_in.email,
                Organization.registration_number_hrf_id == org_in.registration_number_hrf_id
            )
        ).first()

        if existing:
            if existing.email == org_in.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Organization with this email already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization with this Registration Number / HRF ID already exists"
            )

        db_org = Organization(
            org_name=org_in.org_name,
            org_type=org_in.org_type,
            poc_name=org_in.poc_name,
            poc_contact=org_in.poc_contact,
            email=org_in.email,
            registration_number_hrf_id=org_in.registration_number_hrf_id,
            address=org_in.address,
            supporting_docs_url=org_in.supporting_docs_url,
            latitude=org_in.latitude,
            longitude=org_in.longitude,
            approval_status="PENDING",
            password_hash=hash_password(org_in.password)
        )
        db.add(db_org)
        db.commit()
        db.refresh(db_org)
        return db_org

    @staticmethod
    def authenticate_organization(db: Session, login_data: LoginRequest) -> Token:
        org = db.query(Organization).filter(Organization.email == login_data.identifier).first()

        if not org or not verify_password(login_data.password, org.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if org.approval_status != "APPROVED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization approval status is pending or rejected"
            )

        role = org.org_type.lower()  # hospital, blood_bank, ngo
        access_token = create_access_token(data={"sub": str(org.id), "email": org.email, "role": role})
        return Token(access_token=access_token, token_type="bearer")
