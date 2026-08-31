import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Phone, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { ngoApi, describeError } from '../../api/index.js'
import { formatDateTime } from '../../utils/dates.js'

const priorityBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function NgoMyResponses() {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    ngoApi
      .getMyResponses()
      .then(setResponses)
      .catch((err) => setLoadError(describeError(err, 'Could not load your responses.')))
      .finally(() => setLoading(false))
  }, [])

  const pending = responses.filter((r) => r.status === 'ACCEPTED')
  const completed = responses.filter((r) => r.status === 'BLOOD_COLLECTED')

  return (
    <DashboardLayout active="My Responses" links={ngoSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">My Responses</h1>
      <p className="text-muted text-sm mb-6">Blood requests your organization has accepted or completed.</p>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted py-8">Loading responses…</p>
      ) : responses.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          <p className="mb-3">No responses yet.</p>
          <Link to="/ngo/requests" className="text-pink-dark font-bold text-xs hover:underline inline-flex items-center gap-1">
            <span>Browse open requests</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {pending.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3 text-ink flex items-center gap-2">
                <span>Awaiting Collection</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#fff1d6] text-[#b9770e] border border-amber-200">
                  {pending.length}
                </span>
              </h2>
              <div className="flex flex-col gap-3.5">
                {pending.map((resp) => {
                  const req = resp.request
                  const bloodBank = req?.assigned_blood_bank
                  return (
                    <div key={resp.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[220px]">
                          <p className="text-sm font-bold text-ink">
                            {req?.patient_name ?? `Request #${resp.request_id}`}
                            {req?.blood_group_required
                              ? ` · ${req.blood_group_required} × ${req.units_required} unit(s)`
                              : ''}
                          </p>
                          <p className="text-muted text-xs mt-1">
                            {req?.hospital?.org_name ?? 'No hospital listed'}
                          </p>
                          {bloodBank && (
                            <p className="text-slate-600 text-xs mt-1.5 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                              <span>Drop-off: <strong className="text-ink font-semibold">{bloodBank.org_name}</strong></span>
                              {bloodBank.address ? <span className="text-muted">({bloodBank.address})</span> : ''}
                              {bloodBank.poc_contact ? (
                                <span className="text-slate-500 inline-flex items-center gap-1">
                                  · <Phone className="w-3 h-3 text-slate-400" /> {bloodBank.poc_contact}
                                </span>
                              ) : ''}
                            </p>
                          )}
                          {!bloodBank && (
                            <p className="text-muted text-xs mt-1">
                              Blood bank contact info will appear here once assigned.
                            </p>
                          )}
                        </div>
                        {req?.priority && (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${priorityBadge[req.priority] ?? 'bg-line text-muted'}`}>
                            {req.priority}
                          </span>
                        )}
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fff1d6] text-[#b9770e] border border-amber-200">
                          Awaiting collection
                        </span>
                        <Link
                          to={`/ngo/requests/details?id=${resp.request_id}`}
                          className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-bold bg-white border border-line text-ink hover:border-pink hover:text-pink-dark transition-all"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-bold mb-3 text-ink flex items-center gap-2">
                <span>Completed</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
                  {completed.length}
                </span>
              </h2>
              <div className="flex flex-col gap-3.5">
                {completed.map((resp) => {
                  const req = resp.request
                  return (
                    <div key={resp.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[220px]">
                          <p className="text-sm font-bold text-ink">
                            {req?.patient_name ?? `Request #${resp.request_id}`}
                            {req?.blood_group_required
                              ? ` · ${req.blood_group_required} × ${req.units_required} unit(s)`
                              : ''}
                          </p>
                          <p className="text-muted text-xs mt-1">
                            {req?.hospital?.org_name ?? ''} · Donated on {formatDateTime(resp.timestamp)}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Blood collected</span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
