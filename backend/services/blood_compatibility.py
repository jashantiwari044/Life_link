"""Which blood groups can donate to which.

Requests are published to every donor, so a donor whose group cannot help still
sees them. Rather than silently listing an impossible ask, the API tags each
request with whether this donor is a match and which groups actually are.

Standard whole-blood donor -> recipient compatibility:
  O-  is the universal donor; AB+ is the universal recipient.
  Rh- can give to Rh+ but not the reverse.
"""

# donor group -> the recipient groups they can give to
CAN_DONATE_TO = {
    "O-": {"O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"},
    "O+": {"O+", "A+", "B+", "AB+"},
    "A-": {"A-", "A+", "AB-", "AB+"},
    "A+": {"A+", "AB+"},
    "B-": {"B-", "B+", "AB-", "AB+"},
    "B+": {"B+", "AB+"},
    "AB-": {"AB-", "AB+"},
    "AB+": {"AB+"},
}


def can_donate(donor_group: str, recipient_group: str) -> bool:
    """True when a donor of `donor_group` may give to `recipient_group`."""
    if not donor_group or not recipient_group:
        return False
    return recipient_group in CAN_DONATE_TO.get(donor_group.strip().upper(), set())


def compatible_donor_groups(recipient_group: str) -> list[str]:
    """Every donor group that can help this recipient, ordered O- first."""
    if not recipient_group:
        return []
    target = recipient_group.strip().upper()
    groups = [g for g, accepts in CAN_DONATE_TO.items() if target in accepts]
    # Universal donors first, then a stable clinical ordering.
    order = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    return sorted(groups, key=order.index)
