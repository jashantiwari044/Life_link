from typing import Dict, List, Optional
from pydantic import BaseModel


class OrgApprovalPayload(BaseModel):
    approve: bool
    rejection_reason: Optional[str] = None


class PlatformStatsResponse(BaseModel):
    users_count: int
    donors_active_count: int = 0
    organizations_count: int
    hospitals_count: int = 0
    blood_banks_count: int = 0
    ngos_count: int = 0
    pending_orgs_count: int = 0
    requests_total_count: int = 0
    requests_fulfilled_count: int
    requests_open_count: int = 0
    camps_run_count: int
    inventory_total_units: int = 0


class HospitalReportItem(BaseModel):
    id: int
    name: str
    poc_name: str
    poc_contact: str
    address: str
    requests_count: int
    fulfilled_count: int


class NgoReportItem(BaseModel):
    id: int
    name: str
    poc_name: str
    poc_contact: str
    address: str
    drives_count: int
    responses_count: int


class ConnectedHospitalBrief(BaseModel):
    id: int
    name: str


class BloodBankReportItem(BaseModel):
    id: int
    name: str
    poc_name: str
    poc_contact: str
    address: str
    total_units: int
    linked_hospitals_count: int
    linked_hospitals: List[ConnectedHospitalBrief] = []
    fulfillments_count: int
    inventory_breakdown: Dict[str, int]


class MonthlyTrendItem(BaseModel):
    month: str
    requests: int
    fulfilled: int


class PlatformAnalyticsResponse(BaseModel):
    stats: PlatformStatsResponse
    blood_group_distribution: Dict[str, int]
    requests_by_status: Dict[str, int]
    requests_by_urgency: Dict[str, int]
    requests_by_blood_group: Dict[str, int]
    blood_bank_inventory: Dict[str, int]
    orgs_by_type: Dict[str, int]
    hospital_performance: List[HospitalReportItem]
    ngo_activity: List[NgoReportItem]
    blood_bank_performance: List[BloodBankReportItem]
    monthly_trend: List[MonthlyTrendItem]
