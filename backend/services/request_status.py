from fastapi import HTTPException, status

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

# Statuses a request can still move out of. Used wherever a list should show
# everything still in flight rather than only one snapshot status.
NON_TERMINAL_STATUSES = ["PENDING", "VERIFIED", "OPEN", "READY_FOR_DISPATCH", "DISPATCHED"]

# Full BloodRequest.status transition table. Every status change in the
# lifecycle must go through assert_transition so illegal jumps 409 instead
# of silently overwriting state.
ALLOWED_TRANSITIONS = {
    "PENDING": {"VERIFIED", "REJECTED", "CANCELLED"},
    "VERIFIED": {"READY_FOR_DISPATCH", "OPEN", "CANCELLED"},
    "OPEN": {"READY_FOR_DISPATCH", "CANCELLED"},
    "READY_FOR_DISPATCH": {"DISPATCHED"},
    "DISPATCHED": {"BLOOD_RECEIVED"},
    "REJECTED": set(),
    "BLOOD_RECEIVED": set(),
    "CANCELLED": set(),
}


def assert_transition(current_status: str, new_status: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid status transition from {current_status} to {new_status}"
        )
