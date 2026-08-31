import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f]',
  URGENT: 'bg-[#fff1d6] text-[#b9770e]',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d]',
}

const filters = ['All', 'EMERGENCY', 'URGENT', 'PLANNED']

export default function IncomingRequests() {
  const [filter, setFilter] = useState('All')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    bloodBankApi
      .getIncomingRequests()
      .then(setRequests)
      .catch((err) => setLoadError(describeError(err, 'Could not load incoming requests.')))
      .finally(() => setLoading(false))
  }, [])

  const filteredRequests = filter === 'All' ? requests : requests.filter((req) => req.priority === filter)

  return (
    <DashboardLayout active="Incoming Requests" links={bloodBankSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Incoming Requests</h1>
      <p className="text-muted mb-6">
        Every in-flight blood request from hospitals linked to this blood bank. Requests marked
        PENDING are still awaiting hospital verification — you can act on them once they turn VERIFIED.
      </p>

      <LoadError message={loadError} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-[6px] text-[13px] font-semibold border ${
              filter === f ? 'bg-pink text-white border-pink' : 'bg-white text-ink border-line'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-line rounded-[14px]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                <th className="text-left px-[18px] py-[14px]">Hospital</th>
                <th className="text-left px-[18px] py-[14px]">Blood</th>
                <th className="text-left px-[18px] py-[14px]">Units</th>
                <th className="text-left px-[18px] py-[14px]">Urgency</th>
                <th className="text-left px-[18px] py-[14px]">Status</th>
                <th className="text-left px-[18px] py-[14px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="border-b border-line last:border-b-0">
                  <td className="px-[18px] py-[14px]">{req.hospital?.org_name ?? '—'}</td>
                  <td className="px-[18px] py-[14px]">{req.blood_group_required}</td>
                  <td className="px-[18px] py-[14px]">{req.units_required}</td>
                  <td className="px-[18px] py-[14px]">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[req.priority]}`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-[18px] py-[14px]">{req.status}</td>
                  <td className="px-[18px] py-[14px]">
                    <Link to={`/bloodbank/requests/tracking?id=${req.id}`} className="text-pink-dark font-bold">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td className="px-[18px] py-[14px] text-muted" colSpan={6}>
                    No requests match this filter.
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
