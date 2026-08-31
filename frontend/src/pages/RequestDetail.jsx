import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, XCircle } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import LocationView from '../components/LocationView.jsx'
import StatusTimeline from '../components/StatusTimeline.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { bloodRequestsApi, ApiError } from '../api/index.js'
import { formatDateTime } from '../utils/dates.js'
import { CANCELLABLE_STATUSES, statusBadgeClass } from '../constants/requestStatus.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-6 text-sm py-2 border-b border-line last:border-b-0">
      <dt className="text-muted shrink-0 text-xs font-medium">{label}</dt>
      <dd className="font-semibold text-right break-words min-w-0 text-xs text-ink">{children ?? '—'}</dd>
    </div>
  )
}

export default function RequestDetail() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  useEffect(() => {
    let cancelled = false
    bloodRequestsApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setRequest(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not load this request.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function confirmCancel() {
    setError('')
    try {
      const updated = await bloodRequestsApi.cancel(id)
      setRequest(updated)
      setConfirmingCancel(false)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not cancel this request.'
      )
      setConfirmingCancel(false)
    }
  }

  return (
    <DashboardLayout active="My Requests">
      <Link to="/my-requests" className="inline-flex items-center gap-1.5 text-pink-dark text-xs font-bold hover:underline mb-4">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Requests</span>
      </Link>

      {loading ? (
        <p className="text-muted py-8">Loading request details…</p>
      ) : error || !request ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-pink-dark text-sm font-semibold mt-4">
          {error || 'Request not found.'}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap mt-2 mb-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight">
              Request #{String(request.id).padStart(2, '0')}
            </h1>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadgeClass(request.status)}`}>
              {request.status}
            </span>
          </div>
          <p className="text-muted text-xs mb-8">Raised on {formatDateTime(request.created_at)}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <section className="bg-white border border-line rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold mb-4 text-ink">Request Details</h2>
              <dl className="flex flex-col">
                <Row label="Patient Name">{request.patient_name}</Row>
                <Row label="Blood Group Required">
                  <span className="text-pink-dark font-extrabold">{request.blood_group_required}</span>
                </Row>
                <Row label="Units Required">{request.units_required} unit(s)</Row>
                <Row label="Priority">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${urgencyBadge[request.priority]}`}>
                    {request.priority}
                  </span>
                </Row>
                <Row label="Hospital">{request.hospital?.org_name}</Row>
                {request.hospital?.address && <Row label="Hospital Address">{request.hospital.address}</Row>}
                {request.hospital?.poc_contact && <Row label="Hospital Contact">{request.hospital.poc_contact}</Row>}
                {request.emergency_reason && <Row label="Notes">{request.emergency_reason}</Row>}
              </dl>

              {CANCELLABLE_STATUSES.includes(request.status) && (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold bg-white text-[#d5233f] border border-[#d5233f] transition-all hover:bg-red-50 mt-6"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel this request</span>
                </button>
              )}

              {request.hospital && (
                <LocationView
                  className="mt-6"
                  label="Treating hospital"
                  name={request.hospital.org_name}
                  address={request.hospital.address}
                  latitude={request.hospital.latitude}
                  longitude={request.hospital.longitude}
                  height={180}
                />
              )}

              {request.assigned_blood_bank && (
                <LocationView
                  className="mt-4"
                  label="Blood bank handling this"
                  name={request.assigned_blood_bank.org_name}
                  address={request.assigned_blood_bank.address}
                  latitude={request.assigned_blood_bank.latitude}
                  longitude={request.assigned_blood_bank.longitude}
                  height={180}
                />
              )}
            </section>

            <section className="bg-white border border-line rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold mb-1 text-ink">Live Status Journey</h2>
              <p className="text-muted text-xs mb-5">Where your request is in the process right now.</p>
              <StatusTimeline status={request.status} />
            </section>
          </div>

          <ConfirmModal
            open={confirmingCancel}
            title="Cancel this blood request?"
            message={`Request #${String(request.id).padStart(2, '0')} for ${request.units_required} unit(s) of ${request.blood_group_required} will be withdrawn. This action cannot be undone.`}
            confirmLabel="Yes, Cancel Request"
            onConfirm={confirmCancel}
            onCancel={() => setConfirmingCancel(false)}
          />
        </>
      )}
    </DashboardLayout>
  )
}
