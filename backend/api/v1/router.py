from fastapi import APIRouter
from backend.api.v1 import auth, user, organization, blood_request, hospital, blood_bank, ngo, camps, notifications, admin

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(user.router, prefix="/users", tags=["users"])
api_router.include_router(organization.router, prefix="/orgs", tags=["orgs"])
api_router.include_router(blood_request.router, prefix="/blood-requests", tags=["blood-requests"])
api_router.include_router(hospital.router, prefix="/hospital", tags=["hospital"])
api_router.include_router(blood_bank.router, prefix="/blood-bank", tags=["blood-bank"])
api_router.include_router(ngo.router, prefix="/ngo", tags=["ngo"])
api_router.include_router(camps.router, prefix="/camps", tags=["camps"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
