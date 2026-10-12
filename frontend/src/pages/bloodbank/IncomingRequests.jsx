import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

const statusBadge = {
  PENDING: { label: 'Awaiting Decision', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ON_HOLD: { label: 'On Hold (Shortage)', cls: 'bg-red-50 text-red-700 border-red-200' },
  OPEN: { label: 'On Hold (Shortage)', cls: 'bg-red-50 text-red-700 border-red-200' },
  READY_FOR_DISPATCH: { label: 'Ready for Dispatch', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  DISPATCHED: { label: 'Dispatched', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  BLOOD_RECEIVED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

const filters = ['All', 'PENDING', 'ON_HOLD', 'READY_FOR_DISPATCH', 'DISPATCHED']

export default function IncomingRequests() {
  const [filter, setFilter] = useState('All')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    bloodBankApi
      .getIncomingRequests()
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => setLoadError(describeError(err, 'Could not load incoming requisitions.')))
      .finally(() => setLoading(false))
  }, [])

  const filteredRequests = filter === 'All'
    ? requests
    : filter === 'ON_HOLD'
    ? requests.filter((r) => r.status === 'ON_HOLD' || r.status === 'OPEN')
    : requests.filter((req) => req.status === filter)

  return (
    <DashboardLayout active="Incoming Requests" links={bloodBankSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Incoming Hospital Requisitions</h1>
      <p className="text-muted text-sm mb-6">
        Incoming blood requisitions from connected hospitals. Fulfill directly from inventory, or put on hold and notify NGOs to organize a donation drive.
      </p>

      <LoadError message={loadError} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${
              filter === f ? 'bg-pink text-white border-pink shadow-xs' : 'bg-white text-ink border-line hover:border-pink'
            }`}
          >
            {f === 'All' ? `All Requisitions (${requests.length})` : f === 'ON_HOLD' ? 'On Hold (Shortage)' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading requisitions…</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Hospital</th>
                <th className="text-left px-5 py-3.5">Blood Group</th>
                <th className="text-left px-5 py-3.5">Units Requested</th>
                <th className="text-left px-5 py-3.5">Priority</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRequests.map((req) => {
                const statusInfo = statusBadge[req.status] ?? { label: req.status, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
                return (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-bold text-ink">{req.hospital?.org_name ?? 'Hospital'}</td>
                    <td className="px-5 py-4">
                      <span className="font-black text-pink-dark text-base">
                        {req.blood_group_required}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-ink">{req.units_required} unit(s)</td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgencyBadge[req.priority]}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/bloodbank/requests/tracking?id=${req.id}`}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
                      >
                        Review Requisition
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-muted text-sm" colSpan={6}>
                    No hospital requisitions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
