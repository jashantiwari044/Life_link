import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Truck, Building2, Plus, Clock, Droplet } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

const statusBadge = {
  PENDING: { label: 'Awaiting Blood Bank Action', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ON_HOLD: { label: 'On Hold (Stock Shortage)', cls: 'bg-red-50 text-red-700 border-red-200' },
  OPEN: { label: 'On Hold (Stock Shortage)', cls: 'bg-red-50 text-red-700 border-red-200' },
  READY_FOR_DISPATCH: { label: 'Stock Allocated / Ready to Dispatch', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  DISPATCHED: { label: 'Blood In Transit', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  BLOOD_RECEIVED: { label: 'Received & Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const NON_TERMINAL = ['PENDING', 'ON_HOLD', 'OPEN', 'READY_FOR_DISPATCH', 'DISPATCHED']
const filters = ['All', 'PENDING', 'ON_HOLD', 'READY_FOR_DISPATCH', 'DISPATCHED']

export default function PendingRequests() {
  const [filter, setFilter] = useState('All')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function loadRequests() {
    const all = await hospitalApi.listBloodRequests()
    setRequests(all.filter((r) => NON_TERMINAL.includes(r.status)))
  }

  useEffect(() => {
    loadRequests()
      .catch((err) => setLoadError(describeError(err, 'Could not load requisitions.')))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'All'
    ? requests
    : filter === 'ON_HOLD'
    ? requests.filter((r) => r.status === 'ON_HOLD' || r.status === 'OPEN')
    : requests.filter((r) => r.status === filter)

  const inTransit = requests.filter((r) => r.status === 'DISPATCHED')

  return (
    <DashboardLayout active="All Requests" links={hospitalSidebarLinks}>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Active Hospital Blood Requisitions
          </h1>
          <p className="text-muted text-sm">
            Track blood units requested from your connected blood banks and confirm receipt upon delivery.
          </p>
        </div>

        <Link
          to="/hospital/requests/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark"
        >
          <Plus className="w-4 h-4" />
          <span>Raise New Requisition</span>
        </Link>
      </div>

      {inTransit.length > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 sm:p-5 mb-6 flex items-center justify-between gap-4 flex-wrap shadow-xs">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-purple-700 shrink-0" />
            <p className="text-sm font-bold text-purple-900">
              {inTransit.length} blood requisition{inTransit.length > 1 ? 's' : ''} in transit — click "Confirm Received" once delivered to your facility.
            </p>
          </div>
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
            {f === 'All' ? `All Active (${requests.length})` : f === 'ON_HOLD' ? 'On Hold / Shortage' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading requisitions…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          No active requisitions matching this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map((req) => {
            const statusInfo = statusBadge[req.status] ?? { label: req.status, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
            return (
              <div
                key={req.id}
                className="bg-white border border-line rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                    <span className="text-lg font-black text-pink-dark">
                      {req.blood_group_required}
                    </span>
                    <span className="text-base font-extrabold text-ink">
                      · {req.units_required} unit(s)
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgencyBadge[req.priority]}`}>
                      {req.priority}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap mt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.assigned_blood_bank?.org_name ? `Target Blood Bank: ${req.assigned_blood_bank.org_name}` : 'Pending Bank Assignment'}</span>
                    </span>
                    {req.emergency_reason && (
                      <span className="text-slate-500 italic">
                        · Dept: "{req.emergency_reason}"
                      </span>
                    )}
                    <span className="text-slate-400">
                      · Sent {formatDate(req.created_at)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {req.status === 'DISPATCHED' && (
                    <Link
                      to={`/hospital/requests/confirm-received?id=${req.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold bg-[#1f8a3d] text-white shadow-xs hover:bg-green-700 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Blood Received</span>
                    </Link>
                  )}
                  {req.status === 'PENDING' && (
                    <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Blood Bank is reviewing stock</span>
                    </span>
                  )}
                  {(req.status === 'ON_HOLD' || req.status === 'OPEN') && (
                    <span className="text-xs text-red-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Blood Bank on hold / mobilizing NGO drive</span>
                    </span>
                  )}
                  {req.status === 'READY_FOR_DISPATCH' && (
                    <span className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Stock allocated, dispatch packaging in progress</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
