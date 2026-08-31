import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, MapPin, Phone, Building2 } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { ngoApi, describeError } from '../../api/index.js'
import { btnPrimary } from '../../constants/buttonStyles.js'
import { formatDateTime as formatDate } from '../../utils/dates.js'

export default function NgoRequestDetails() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    Promise.all([ngoApi.getRequestDetail(id), ngoApi.getMyResponses()])
      .then(([req, responses]) => {
        setRequest(req)
        const alreadyAccepted = responses.some((r) => String(r.request_id) === String(req.id))
        setAccepted(alreadyAccepted)
      })
      .catch((err) => setError(describeError(err, 'Could not load request details.')))
      .finally(() => setLoading(false))
  }, [id])

  async function handleAccept() {
    setError('')
    try {
      await ngoApi.respondToRequest(id)
      setAccepted(true)
    } catch (err) {
      setError(describeError(err, 'Could not accept this request.'))
    }
  }

  const bloodBank = request?.assigned_blood_bank

  return (
    <DashboardLayout active="Active Requests" links={ngoSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Request Details</h1>
      <p className="text-muted text-sm mb-6">{id ? `Request #${id}` : 'No request selected.'}</p>

      {loading ? (
        <p className="text-muted py-8">Loading…</p>
      ) : !request ? (
        <div className="bg-white border border-line rounded-2xl p-6 text-muted text-sm shadow-xs max-w-[560px]">
          Open this page from Active Requests to see details.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[560px] shadow-xs">
          <h2 className="text-lg font-bold text-ink mb-6">{request.patient_name}</h2>

          <dl className="flex flex-col gap-3 mb-6">
            <div className="flex justify-between text-sm py-1.5 border-b border-line">
              <dt className="text-muted text-xs">Blood Group</dt>
              <dd className="font-extrabold text-xs text-pink-dark">{request.blood_group_required}</dd>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b border-line">
              <dt className="text-muted text-xs">Units Required</dt>
              <dd className="font-semibold text-xs text-ink">{request.units_required} unit(s)</dd>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b border-line">
              <dt className="text-muted text-xs">Priority</dt>
              <dd className="font-semibold text-xs text-ink">{request.priority}</dd>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b border-line">
              <dt className="text-muted text-xs">Hospital</dt>
              <dd className="font-semibold text-xs text-ink">{request.hospital?.org_name ?? '—'}</dd>
            </div>
            <div className="flex justify-between text-sm py-1.5">
              <dt className="text-muted text-xs">Submitted</dt>
              <dd className="font-semibold text-xs text-ink">{formatDate(request.created_at)}</dd>
            </div>
          </dl>

          {request.emergency_reason && (
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-line text-xs">
              <p className="font-bold text-ink mb-1">Notes</p>
              <p className="text-muted leading-relaxed">{request.emergency_reason}</p>
            </div>
          )}

          {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

          {accepted ? (
            <div className="flex flex-col gap-3">
              <div className="p-3.5 bg-[#e3f5e8] border border-[#86efac] rounded-2xl flex items-center gap-2 text-[#1f8a3d] text-sm font-bold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>You've accepted coordination for this request.</span>
              </div>
              {bloodBank ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 text-xs">
                  <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-pink-dark" />
                    <span>Collection Point (Blood Bank)</span>
                  </p>
                  <p className="text-ink font-semibold">{bloodBank.org_name}</p>
                  <p className="text-muted mt-1">{bloodBank.address}</p>
                  {bloodBank.poc_contact && (
                    <p className="text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>Contact: {bloodBank.poc_contact} {bloodBank.poc_name ? `(${bloodBank.poc_name})` : ''}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted text-xs">
                  The assigned blood bank will contact you with collection details.
                </p>
              )}
            </div>
          ) : (
            <button type="button" className={btnPrimary} onClick={handleAccept}>
              Accept Request
            </button>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
