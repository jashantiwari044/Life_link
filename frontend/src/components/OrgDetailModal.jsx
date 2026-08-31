import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Modal from './Modal.jsx'
import LocationView from './LocationView.jsx'
import { formatDate } from '../utils/dates.js'

const primaryBtn =
  'inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-50'
const outlineBtn =
  'inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark disabled:opacity-50'

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-6 text-sm py-2 border-b border-line last:border-b-0">
      <dt className="text-muted shrink-0 text-xs font-medium">{label}</dt>
      <dd className="font-semibold text-right break-words min-w-0 text-xs text-ink">{children ?? '—'}</dd>
    </div>
  )
}

/**
 * Full organization profile in an overlay. Used by the admin approvals queue
 * (with Approve/Reject actions and a rejection reason) and, read-only, by the
 * blood bank's linked hospitals list.
 */
export default function OrgDetailModal({ org, open, onClose, onDecision, extraRows }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!org) return null

  function close() {
    if (busy) return
    setRejecting(false)
    setReason('')
    setError('')
    onClose?.()
  }

  async function decide(approve) {
    setError('')
    setBusy(true)
    try {
      await onDecision(org.id, approve, approve ? undefined : reason.trim() || undefined)
      setRejecting(false)
      setReason('')
    } catch (err) {
      setError(err?.detail?.detail ?? err?.message ?? 'Could not save that decision.')
    } finally {
      setBusy(false)
    }
  }

  const footer = onDecision ? (
    rejecting ? (
      <>
        <button type="button" className={outlineBtn} disabled={busy} onClick={() => setRejecting(false)}>
          Go Back
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold bg-[#d5233f] text-white transition-all duration-150 hover:-translate-y-px disabled:opacity-50"
          disabled={busy}
          onClick={() => decide(false)}
        >
          {busy ? 'Working…' : 'Confirm Rejection'}
        </button>
      </>
    ) : (
      <>
        <button type="button" className={outlineBtn} disabled={busy} onClick={() => setRejecting(true)}>
          Reject
        </button>
        <button type="button" className={primaryBtn} disabled={busy} onClick={() => decide(true)}>
          {busy ? 'Working…' : 'Approve'}
        </button>
      </>
    )
  ) : (
    <button type="button" className={outlineBtn} onClick={close}>
      Close
    </button>
  )

  return (
    <Modal open={open} title={org.org_name} onClose={close} footer={footer}>
      <dl className="flex flex-col">
        <Row label="Organization Type">{org.org_type}</Row>
        <Row label="Registration / HRF ID">{org.registration_number_hrf_id}</Row>
        <Row label="Address">{org.address}</Row>
        <Row label="Point of Contact">{org.poc_name}</Row>
        <Row label="Contact Number">{org.poc_contact}</Row>
        {org.email && <Row label="Email">{org.email}</Row>}
        {org.approval_status && <Row label="Approval Status">{org.approval_status}</Row>}
        {org.created_at && <Row label="Registered On">{formatDate(org.created_at)}</Row>}
        <Row label="Supporting Documents">
          {org.supporting_docs_url ? (
            <a
              href={org.supporting_docs_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-pink-dark font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <span>Open document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            'Not provided'
          )}
        </Row>
        {extraRows?.map((row) => (
          <Row key={row.label} label={row.label}>
            {row.value}
          </Row>
        ))}
      </dl>

      {/* The address again, but placeable on a map and one tap from directions. */}
      <LocationView
        className="mt-5"
        label="On the map"
        name={org.org_name}
        address={org.address}
        latitude={org.latitude}
        longitude={org.longitude}
        height={180}
      />

      {rejecting && (
        <div className="mt-5 flex flex-col gap-[6px]">
          <label htmlFor="rejectionReason" className="text-[13px] font-semibold text-ink">
            Reason for rejection (sent to the organization)
          </label>
          <textarea
            id="rejectionReason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Registration number could not be verified."
            className="border border-line rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink resize-none"
          />
        </div>
      )}

      {error && <p className="text-pink-dark text-xs font-semibold mt-4">{error}</p>}
    </Modal>
  )
}
