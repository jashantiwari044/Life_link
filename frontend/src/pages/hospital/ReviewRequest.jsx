import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, describeError } from '../../api/index.js'
import { formatDateTime as formatDate } from '../../utils/dates.js'
import { btnPrimary, btnOutline } from '../../constants/buttonStyles.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function ReviewRequest() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    hospitalApi.getBloodRequest(id).then((data) => {
      setRequest(data)
      setLoading(false)
    })
  }, [id])

  async function handleVerify(approve) {
    setError('')
    setBusy(true)
    try {
      const updated = await hospitalApi.verifyRequest(id, approve, approve ? undefined : rejectionReason || undefined)
      setRequest(updated)
      setShowRejectForm(false)
    } catch (err) {
      setError(describeError(err, 'Could not update this request.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardLayout active="All Requests" links={hospitalSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Review Request</h1>
      <p className="text-muted mb-6">{id ? `Request ID: BL${1000 + Number(id)}` : 'No request selected.'}</p>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : !request ? (
        <p className="text-muted text-sm">Open this page from the pending requests list to review a request.</p>
      ) : (
        <div className="bg-white border border-line rounded-[14px] p-8 max-w-[560px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[19px] font-bold">{request.patient_name}</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[request.priority]}`}>
              {request.priority}
            </span>
          </div>

          <dl className="flex flex-col gap-3 mb-6">
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Blood Group</dt>
              <dd className="font-semibold">{request.blood_group_required}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Units Required</dt>
              <dd className="font-semibold">{request.units_required}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Status</dt>
              <dd className="font-semibold">{request.status}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-muted">Submitted</dt>
              <dd className="font-semibold">{formatDate(request.created_at)}</dd>
            </div>
          </dl>

          {request.emergency_reason && (
            <div className="mb-6">
              <p className="text-[13px] font-semibold text-ink mb-1">Emergency Details</p>
              <p className="text-sm text-muted">{request.emergency_reason}</p>
            </div>
          )}

          {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

          {request.status === 'PENDING' && (
            <>
              {showRejectForm ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    rows={3}
                    placeholder="Reason for rejection (optional)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="border border-line rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink resize-none"
                  />
                  <div className="flex gap-3">
                    <button type="button" disabled={busy} className={btnPrimary} onClick={() => handleVerify(false)}>
                      Confirm Reject
                    </button>
                    <button type="button" disabled={busy} className={btnOutline} onClick={() => setShowRejectForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button type="button" disabled={busy} className={btnPrimary} onClick={() => handleVerify(true)}>
                    Accept Request
                  </button>
                  <button type="button" disabled={busy} className={btnOutline} onClick={() => setShowRejectForm(true)}>
                    Reject Request
                  </button>
                </div>
              )}
            </>
          )}

          {request.status === 'VERIFIED' && (
            <p className="text-sm font-semibold text-[#1f8a3d] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified and forwarded to your blood bank.</span>
            </p>
          )}

          {request.status === 'REJECTED' && (
            <p className="text-sm font-semibold text-pink-dark flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              <span>Request rejected.</span>
            </p>
          )}

          {request.status === 'DISPATCHED' && (
            <Link to={`/hospital/requests/confirm-received?id=${request.id}`} className="text-pink-dark font-bold text-sm hover:underline inline-flex items-center gap-1">
              <span>Go to Confirm Blood Received</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
