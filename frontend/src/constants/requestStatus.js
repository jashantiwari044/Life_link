// Single source of truth for how a BloodRequest.status is rendered anywhere in
// the citizen-facing UI. Mirrors backend/services/request_status.py.

export const ACTIVE_STATUSES = ['PENDING', 'VERIFIED', 'OPEN', 'READY_FOR_DISPATCH', 'DISPATCHED']

// Blood is already physically committed once READY_FOR_DISPATCH/DISPATCHED, so
// cancellation is only offered for the earlier, still-reversible states.
export const CANCELLABLE_STATUSES = ['PENDING', 'VERIFIED', 'OPEN']

// The happy path a request walks. OPEN is optional — it only appears when the
// blood bank was short on stock and had to publish the request to donors.
export const REQUEST_JOURNEY = [
  {
    status: 'PENDING',
    label: 'Submitted',
    description: 'Request raised. Waiting for the hospital to verify the patient details.',
  },
  {
    status: 'VERIFIED',
    label: 'Hospital Verified',
    description: 'The hospital reviewed the request and forwarded it to their linked blood bank.',
  },
  {
    status: 'OPEN',
    label: 'Published to Donors',
    description: 'Blood bank stock was short, so the request was published to nearby donors and NGOs.',
    optional: true,
  },
  {
    status: 'READY_FOR_DISPATCH',
    label: 'Blood Secured',
    description: 'Blood has been secured — either from bank stock or a verified donation.',
  },
  {
    status: 'DISPATCHED',
    label: 'Dispatched',
    description: 'Blood is on its way to the hospital.',
  },
  {
    status: 'BLOOD_RECEIVED',
    label: 'Received',
    description: 'The hospital confirmed receipt. This request is complete.',
  },
]

export const TERMINAL_FAILURE_STATUSES = {
  REJECTED: {
    label: 'Rejected',
    description: 'The hospital rejected this request. Check your notifications for the reason.',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'You cancelled this request. Nothing further will happen with it.',
  },
}

export const STATUS_BADGE = {
  PENDING: 'bg-[#fff1d6] text-[#b9770e]',
  VERIFIED: 'bg-[#fff1d6] text-[#b9770e]',
  OPEN: 'bg-[#fff1d6] text-[#b9770e]',
  READY_FOR_DISPATCH: 'bg-[#fff1d6] text-[#b9770e]',
  DISPATCHED: 'bg-[#fff1d6] text-[#b9770e]',
  BLOOD_RECEIVED: 'bg-[#e3f5e8] text-[#1f8a3d]',
  CANCELLED: 'bg-[#ffe1e1] text-[#d5233f]',
  REJECTED: 'bg-[#ffe1e1] text-[#d5233f]',
}

export function statusBadgeClass(status) {
  return STATUS_BADGE[status] ?? 'bg-line text-muted'
}

/**
 * Builds the steps to render for a given request.
 *
 * A step is `done` once the request has moved past it, `current` when the
 * request sits on it, and `upcoming` otherwise. The optional OPEN step is
 * dropped unless the request actually went through it.
 *
 * Pass `fulfillmentType` ('COMMUNITY' | 'DIRECT' | null) so the OPEN step
 * stays visible even after the request advances past OPEN to READY_FOR_DISPATCH,
 * DISPATCHED, or BLOOD_RECEIVED — previously it would silently drop the step.
 */
export function buildJourney(status, fulfillmentType = null) {
  // Show the OPEN step when the request is currently OPEN OR when it went
  // through the community-donation path (fulfillment_type === 'COMMUNITY').
  const wentThroughDonors =
    status === 'OPEN' ||
    (fulfillmentType === 'COMMUNITY' &&
      ['READY_FOR_DISPATCH', 'DISPATCHED', 'BLOOD_RECEIVED'].includes(status))
  const steps = REQUEST_JOURNEY.filter((step) => !step.optional || wentThroughDonors)

  // A rejected or cancelled request stopped somewhere after submission; the
  // backend keeps no history of where, so only the first step is claimed done.
  if (TERMINAL_FAILURE_STATUSES[status]) {
    return steps.map((step, index) => ({ ...step, state: index === 0 ? 'done' : 'halted' }))
  }

  const currentIndex = steps.findIndex((step) => step.status === status)

  return steps.map((step, index) => ({
    ...step,
    state:
      currentIndex === -1
        ? 'upcoming'
        : index < currentIndex
        ? 'done'
        : index === currentIndex
        ? 'current'
        : 'upcoming',
  }))
}

// Statuses where the request has left the hospital's hands and is with the
// blood bank or the donor community. The hospital used to see nothing at all
// between "forwarded" and "received".
export const IN_PROGRESS_STATUSES = ['VERIFIED', 'OPEN', 'READY_FOR_DISPATCH', 'DISPATCHED']

/**
 * Plain-English answer to "what is happening with this request right now?",
 * written from the hospital's point of view.
 *
 * Returns { label, detail, tone, action } — `action` is set only when the
 * hospital itself has something to do.
 */
export function hospitalStage(request) {
  const bank = request.assigned_blood_bank?.org_name
  const withBank = bank ? `with ${bank}` : 'with your linked blood bank'

  switch (request.status) {
    case 'PENDING':
      return {
        label: 'Awaiting your review',
        detail: 'Verify or reject this request to move it forward.',
        tone: 'warn',
        action: 'review',
      }
    case 'VERIFIED':
      return {
        label: 'Forwarded to blood bank',
        detail: `Sent ${withBank}. They are checking stock and will either dispatch from their inventory or publish it to donors.`,
        tone: 'warn',
      }
    case 'OPEN':
      return {
        label: 'Published to donors',
        detail:
          request.responder_count > 0
            ? `Stock was short, so ${bank ?? 'the blood bank'} published it. ${request.responder_count} volunteer(s) have responded; ${request.collected_count} donation(s) collected so far.`
            : `Stock was short, so ${bank ?? 'the blood bank'} published it to donors and NGOs. No volunteers yet.`,
        tone: 'warn',
      }
    case 'READY_FOR_DISPATCH':
      return {
        label: 'Blood secured',
        detail:
          request.fulfillment_type === 'DIRECT'
            ? `${bank ?? 'The blood bank'} is dispatching from their own stock.`
            : `A donation has been collected and verified ${withBank}. Awaiting dispatch.`,
        tone: 'warn',
      }
    case 'DISPATCHED':
      return {
        label: 'On its way',
        detail: `${bank ?? 'The blood bank'} has dispatched the blood. Confirm receipt once it arrives — the request stays open until you do.`,
        tone: 'warn',
        action: 'confirm',
      }
    case 'BLOOD_RECEIVED':
      return {
        label: 'Completed',
        detail: 'You confirmed receipt. This request is closed.',
        tone: 'good',
      }
    case 'REJECTED':
      return { label: 'Rejected', detail: 'You rejected this request.', tone: 'bad' }
    case 'CANCELLED':
      return { label: 'Cancelled', detail: 'The requester cancelled this request.', tone: 'bad' }
    default:
      return { label: request.status, detail: '', tone: 'warn' }
  }
}

export const TONE_TEXT = {
  good: 'text-[#1f8a3d]',
  warn: 'text-[#b9770e]',
  bad: 'text-[#d5233f]',
}
