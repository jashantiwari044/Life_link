import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { ngoApi, describeError } from '../../api/index.js'

const priorityBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function NgoActiveRequests() {
  const [requests, setRequests] = useState([])
  const [respondedIds, setRespondedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    // Load both lists in parallel: all open requests + this NGO's own responses.
    // The intersection is used to show "Already Responded" badges per row.
    Promise.all([ngoApi.listActiveRequests(), ngoApi.getMyResponses()])
      .then(([reqs, myResponses]) => {
        setRequests(reqs)
        setRespondedIds(new Set(myResponses.map((r) => r.request_id)))
      })
      .catch((err) => setLoadError(describeError(err, 'Could not load active requests.')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout active="Active Requests" links={ngoSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Active Requests</h1>
      <p className="text-muted text-sm mb-6">Community blood requests open for volunteer responses.</p>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted py-8">Loading requests…</p>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          No active requests right now.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                <th className="text-left px-5 py-3.5">Patient</th>
                <th className="text-left px-5 py-3.5">Blood Group</th>
                <th className="text-left px-5 py-3.5">Units</th>
                <th className="text-left px-5 py-3.5">Priority</th>
                <th className="text-left px-5 py-3.5">Hospital</th>
                <th className="text-left px-5 py-3.5">Status</th>
                <th className="text-left px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const alreadyResponded = respondedIds.has(req.id)
                return (
                  <tr key={req.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-ink">{req.patient_name}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                        {req.blood_group_required}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold">{req.units_required} unit(s)</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${priorityBadge[req.priority] ?? 'bg-line text-muted'}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink">{req.hospital?.org_name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      {alreadyResponded ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accepted</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#fff1d6] text-[#b9770e] border border-amber-200">
                          Open
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/ngo/requests/details?id=${req.id}`}
                        className="text-pink-dark font-bold text-xs hover:underline inline-flex items-center gap-1"
                      >
                        <span>{alreadyResponded ? 'View' : 'Respond'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  )
}
