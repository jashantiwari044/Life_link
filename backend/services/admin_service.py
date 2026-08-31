from typing import List, Optional, Dict
import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.core.models import (
    User,
    Organization,
    BloodRequest,
    DonationCamp,
    CommunityResponse,
    BloodInventory,
    HospitalBloodBankLink,
    RequestFulfillment,
)
from backend.services.notification_service import NotificationService


class AdminService:
    @staticmethod
    def list_pending_orgs(db: Session) -> List[Organization]:
        return db.query(Organization).filter(
            Organization.approval_status.in_(["PENDING", "REJECTED"])
        ).order_by(Organization.created_at.desc()).all()

    @staticmethod
    def list_active_orgs(db: Session) -> List[Organization]:
        return db.query(Organization).filter(
            Organization.approval_status == "APPROVED"
        ).order_by(Organization.created_at.desc()).all()

    @staticmethod
    def approve_reject_org(
        db: Session, org_id: int, approve: bool, rejection_reason: Optional[str] = None
    ) -> Organization:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        org.approval_status = "APPROVED" if approve else "REJECTED"
        db.add(org)
        db.commit()
        db.refresh(org)

        # Notify the organization
        status_text = "approved" if approve else "rejected"
        message_body = f"Your organization registration request has been {status_text}."
        if rejection_reason and not approve:
            message_body += f" Reason: {rejection_reason}"

        NotificationService.create_notification(
            db=db,
            recipient_id=org.id,
            recipient_type="org",
            title="Organization Registration Status Update",
            message=message_body
        )

        return org

    @staticmethod
    def revoke_org(db: Session, org_id: int) -> Organization:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        org.approval_status = "PENDING"
        db.add(org)
        db.commit()
        db.refresh(org)

        NotificationService.create_notification(
            db=db,
            recipient_id=org.id,
            recipient_type="org",
            title="Organization Access Revoked",
            message="Your organization access has been revoked and is now pending review."
        )

        return org

    @staticmethod
    def list_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).order_by(User.id.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_user_detail(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

    @staticmethod
    def get_platform_stats(db: Session) -> dict:
        users_count = db.query(User).count()
        donors_active_count = db.query(User).filter(User.donor_mode_enabled == True).count()
        orgs_count = db.query(Organization).filter(Organization.approval_status == "APPROVED").count()
        hospitals_count = db.query(Organization).filter(Organization.org_type == "HOSPITAL", Organization.approval_status == "APPROVED").count()
        blood_banks_count = db.query(Organization).filter(Organization.org_type == "BLOOD_BANK", Organization.approval_status == "APPROVED").count()
        ngos_count = db.query(Organization).filter(Organization.org_type == "NGO", Organization.approval_status == "APPROVED").count()
        pending_orgs_count = db.query(Organization).filter(Organization.approval_status == "PENDING").count()
        requests_total_count = db.query(BloodRequest).count()
        fulfilled_count = db.query(BloodRequest).filter(
            BloodRequest.status == "BLOOD_RECEIVED"
        ).count()
        requests_open_count = db.query(BloodRequest).filter(
            BloodRequest.status.in_(["OPEN", "VERIFIED", "DISPATCHED"])
        ).count()
        camps_count = db.query(DonationCamp).count()

        total_inventory = db.query(func.sum(BloodInventory.units_available)).scalar() or 0

        return {
            "users_count": users_count,
            "donors_active_count": donors_active_count,
            "organizations_count": orgs_count,
            "hospitals_count": hospitals_count,
            "blood_banks_count": blood_banks_count,
            "ngos_count": ngos_count,
            "pending_orgs_count": pending_orgs_count,
            "requests_total_count": requests_total_count,
            "requests_fulfilled_count": fulfilled_count,
            "requests_open_count": requests_open_count,
            "camps_run_count": camps_count,
            "inventory_total_units": int(total_inventory)
        }

    @staticmethod
    def get_platform_analytics(db: Session) -> dict:
        stats = AdminService.get_platform_stats(db)

        # 1. Blood group distribution among registered users
        bg_counts = db.query(User.blood_group, func.count(User.id)).group_by(User.blood_group).all()
        blood_group_distribution = {bg: 0 for bg in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
        for bg, count in bg_counts:
            if bg in blood_group_distribution:
                blood_group_distribution[bg] = count
            elif bg:
                blood_group_distribution[bg] = count

        # 2. Blood Bank Inventory aggregated across all approved blood banks
        bb_inv_counts = db.query(
            BloodInventory.blood_group,
            func.sum(BloodInventory.units_available)
        ).join(Organization, Organization.id == BloodInventory.blood_bank_id).filter(
            Organization.approval_status == "APPROVED"
        ).group_by(BloodInventory.blood_group).all()
        blood_bank_inventory = {bg: 0 for bg in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
        for bg, units in bb_inv_counts:
            if bg:
                blood_bank_inventory[bg] = int(units or 0)

        # 3. Requests by status
        status_counts = db.query(BloodRequest.status, func.count(BloodRequest.id)).group_by(BloodRequest.status).all()
        requests_by_status = {
            "PENDING": 0, "VERIFIED": 0, "OPEN": 0, "DISPATCHED": 0, "BLOOD_RECEIVED": 0, "CANCELLED": 0
        }
        for st, count in status_counts:
            if st:
                requests_by_status[st] = count

        # 4. Requests by urgency
        urgency_counts = db.query(BloodRequest.priority, func.count(BloodRequest.id)).group_by(BloodRequest.priority).all()
        requests_by_urgency = {"EMERGENCY": 0, "URGENT": 0, "PLANNED": 0}
        for pr, count in urgency_counts:
            if pr:
                requests_by_urgency[pr] = count

        # 5. Units requested by blood group
        bg_req_counts = db.query(
            BloodRequest.blood_group_required,
            func.sum(BloodRequest.units_required)
        ).group_by(BloodRequest.blood_group_required).all()
        requests_by_blood_group = {bg: 0 for bg in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
        for bg, units in bg_req_counts:
            if bg:
                requests_by_blood_group[bg] = int(units or 0)

        # 6. Organizations by type
        orgs_by_type = {
            "HOSPITAL": stats["hospitals_count"],
            "BLOOD_BANK": stats["blood_banks_count"],
            "NGO": stats["ngos_count"]
        }

        # 7. Hospital Performance report
        hospitals = db.query(Organization).filter(
            Organization.org_type == "HOSPITAL",
            Organization.approval_status == "APPROVED"
        ).all()
        hospital_performance = []
        for h in hospitals:
            req_count = db.query(BloodRequest).filter(BloodRequest.hospital_id == h.id).count()
            ful_count = db.query(BloodRequest).filter(
                BloodRequest.hospital_id == h.id,
                BloodRequest.status == "BLOOD_RECEIVED"
            ).count()
            hospital_performance.append({
                "id": h.id,
                "name": h.org_name,
                "poc_name": h.poc_name,
                "poc_contact": h.poc_contact,
                "address": h.address,
                "requests_count": req_count,
                "fulfilled_count": ful_count
            })

        # 8. NGO Activity report
        ngos = db.query(Organization).filter(
            Organization.org_type == "NGO",
            Organization.approval_status == "APPROVED"
        ).all()
        ngo_activity = []
        for ngo in ngos:
            drives = db.query(DonationCamp).filter(DonationCamp.ngo_id == ngo.id).count()
            responses = db.query(CommunityResponse).filter(CommunityResponse.ngo_id == ngo.id).count()
            ngo_activity.append({
                "id": ngo.id,
                "name": ngo.org_name,
                "poc_name": ngo.poc_name,
                "poc_contact": ngo.poc_contact,
                "address": ngo.address,
                "drives_count": drives,
                "responses_count": responses
            })

        # 9. Blood Bank Performance & Inventory report
        blood_banks = db.query(Organization).filter(
            Organization.org_type == "BLOOD_BANK",
            Organization.approval_status == "APPROVED"
        ).all()
        blood_bank_performance = []
        for bb in blood_banks:
            inv_items = db.query(BloodInventory).filter(BloodInventory.blood_bank_id == bb.id).all()
            inv_map = {bg: 0 for bg in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
            total_u = 0
            for item in inv_items:
                inv_map[item.blood_group] = item.units_available
                total_u += item.units_available

            links = db.query(HospitalBloodBankLink).filter(
                HospitalBloodBankLink.blood_bank_id == bb.id,
                HospitalBloodBankLink.status == "APPROVED"
            ).all()

            linked_hospitals = [
                {
                    "id": link.hospital_id,
                    "name": link.hospital.org_name if link.hospital else f"Hospital #{link.hospital_id}"
                }
                for link in links
            ]

            ful_count = db.query(RequestFulfillment).filter(
                RequestFulfillment.assigned_blood_bank_id == bb.id
            ).count()

            blood_bank_performance.append({
                "id": bb.id,
                "name": bb.org_name,
                "poc_name": bb.poc_name,
                "poc_contact": bb.poc_contact,
                "address": bb.address,
                "total_units": total_u,
                "linked_hospitals_count": len(linked_hospitals),
                "linked_hospitals": linked_hospitals,
                "fulfillments_count": ful_count,
                "inventory_breakdown": inv_map
            })

        # 10. Monthly Trend
        all_requests = db.query(BloodRequest).order_by(BloodRequest.created_at.asc()).all()
        months_dict = {}
        for r in all_requests:
            if r.created_at:
                m_str = r.created_at.strftime("%b %Y")
                if m_str not in months_dict:
                    months_dict[m_str] = {"month": m_str, "requests": 0, "fulfilled": 0}
                months_dict[m_str]["requests"] += 1
                if r.status == "BLOOD_RECEIVED":
                    months_dict[m_str]["fulfilled"] += 1

        if not months_dict:
            now_str = datetime.datetime.utcnow().strftime("%b %Y")
            monthly_trend = [{"month": now_str, "requests": 0, "fulfilled": 0}]
        else:
            monthly_trend = list(months_dict.values())

        return {
            "stats": stats,
            "blood_group_distribution": blood_group_distribution,
            "requests_by_status": requests_by_status,
            "requests_by_urgency": requests_by_urgency,
            "requests_by_blood_group": requests_by_blood_group,
            "blood_bank_inventory": blood_bank_inventory,
            "orgs_by_type": orgs_by_type,
            "hospital_performance": hospital_performance,
            "ngo_activity": ngo_activity,
            "blood_bank_performance": blood_bank_performance,
            "monthly_trend": monthly_trend
        }
