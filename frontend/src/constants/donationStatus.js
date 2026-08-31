// How a donor's own commitment is described back to them. `CommunityResponse`
// only stores ACCEPTED / BLOOD_COLLECTED, which says nothing to a person about
// whether they still owe a donation.

export const DONATION_STATUS = {
  ACCEPTED: {
    label: 'Donation pending',
    badge: 'bg-[#fff1d6] text-[#b9770e]',
    // Filled in with the collection centre where one is known.
    summary: "You've committed to donate — you haven't given blood yet.",
    done: false,
  },
  NOT_NEEDED: {
    label: 'No longer needed',
    badge: 'bg-slate-100 text-muted',
    summary:
      'The blood bank sourced this from their own stock, so you were not needed. Thank you for stepping up.',
    done: true,
  },
  BLOOD_COLLECTED: {
    label: 'Donated',
    badge: 'bg-[#e3f5e8] text-[#1f8a3d]',
    summary: 'Your blood was collected and verified. Thank you.',
    done: true,
  },
}

export function donationStatus(status) {
  return DONATION_STATUS[status] ?? { label: status, badge: 'bg-line text-muted', summary: '', done: false }
}

/**
 * Where a donor physically goes for a given request, or null when the blood
 * bank has not been assigned yet.
 */
export function collectionCentre(request) {
  return request?.assigned_blood_bank ?? null
}

/** Keyless Google Maps search link — blood banks store an address, not coordinates. */
export function addressSearchUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
