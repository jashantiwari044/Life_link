import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Truck, Building2, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, describeError } from '../../api/index.js'
import { hospitalStage, TONE_TEXT } from '../../constants/requestStatus.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

const NON_TERMINAL = ['PENDING', 'VERIFIED', 'OPEN', 'READY_FOR_DISPATCH', 'DISPATCHED']
const filters = ['All', 'PENDING', 'VERIFIED', 'OPEN', 'READY_FOR_DISPATCH', 'DISPATCHED']

export default function PendingRequests() {
  const [filter, setFilter] = useState('All')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    hospitalApi
      .listBloodRequests()
      .then((all) => setRequests(all.filter((r) => NON_TERMINAL.includes(r.status))))
      .catch((err) => setLoadError(describeError(err, 'Could not load requests.')))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'All' ? requests : requests.filter((r) => r.status === filter)
  const awaitingAction = requests.filter((r) => r.status === 'DISPATCHED')

  return (
    <DashboardLayout active="All Requests" links={hospitalSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">All Active Requests</h1>
      <p className="text-muted text-sm mb-4">Requests waiting for verification or action from your hospital.</p>

      {awaitingAction.length > 0 && (
        <div className="rounded-2xl border border-[#d5233f]/30 bg-[#ffe1e1]/80 p-4 sm:p-5 mb-6 flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-[#d5233f] shrink-0" />
          <p className="text-sm font-bold text-[#d5233f]">
            {awaitingAction.length} request{awaitingAction.length > 1 ? 's' : ''} dispatched — awaiting your receipt confirmation.
          </p>
        </div>
      )}

      <LoadError message={loadError} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === f ? 'bg-pink text-white shadow-xs' : 'bg-white text-ink border border-line hover:border-pink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading requests…</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map((req) => {
            const stage = hospitalStage(req)
            return (
              <div key={req.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-bold text-ink">
                      {req.patient_name} · <span className="text-pink-dark font-extrabold">{req.blood_group_required}</span> × {req.units_required} unit(s)
                    </p>
                    <p className="text-muted text-xs mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {req.assigned_blood_bank?.org_name
                          ? `With ${req.assigned_blood_bank.org_name}`
                          : 'Pending blood bank assignment'}
                      </span>
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[req.priority]}`}>
                    {req.priority}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                    {req.status}
                  </span>
                  {req.status === 'PENDING' && (
                    <Link
                      to={`/hospital/requests/review?id=${req.id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-full px-5 py-2 text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                  {req.status === 'DISPATCHED' && (
                    <Link
                      to={`/hospital/requests/confirm-received?id=${req.id}`}
                      className="inline-flex items-center justify-center gap-1 rounded-full px-5 py-2 text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Received</span>
                    </Link>
                  )}
                </div>
                <p className={`text-xs font-semibold mt-3 pt-3 border-t border-line ${TONE_TEXT[stage.tone]}`}>
                  {stage.detail}
                </p>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
              No requests match this filter.
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
