import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Phone,
  ArrowRight,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { orgsApi, hospitalApi, describeError } from '../../api/index.js'
import { IN_PROGRESS_STATUSES, hospitalStage, TONE_TEXT } from '../../constants/requestStatus.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function HospitalDashboard() {
  const [org, setOrg] = useState(null)
  const [requests, setRequests] = useState([])
  const [linkedBank, setLinkedBank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([orgsApi.getMe(), hospitalApi.listBloodRequests(), hospitalApi.getLinkedBloodBank()])
      .then(([orgData, requestData, bank]) => {
        if (cancelled) return
        setOrg(orgData)
        setRequests(requestData)
        setLinkedBank(bank)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(describeError(err, 'Could not load the dashboard.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || loadError) {
    return (
      <DashboardLayout active="Dashboard" links={hospitalSidebarLinks}>
        <LoadError message={loadError} />
        {loading && <p className="text-muted py-8">Loading hospital dashboard…</p>}
      </DashboardLayout>
    )
  }

  const pending = requests.filter((r) => r.status === 'PENDING')
  const inProgress = requests.filter((r) => IN_PROGRESS_STATUSES.includes(r.status))
  const awaitingReceipt = inProgress.filter((r) => r.status === 'DISPATCHED')

  return (
    <DashboardLayout active="Dashboard" links={hospitalSidebarLinks} user={{ name: org.org_name }}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Welcome, {org.org_name} 👋
        </h1>
        <p className="text-muted text-sm">Hospital blood requests operations and fulfillment center.</p>
      </div>

      <LoadError message={loadError} />

      {/* KPI Cards */}
      <div className="flex gap-4 flex-wrap mb-10">
        <div className="bg-white border border-line rounded-2xl p-5 w-[200px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Pending Requests</p>
          <p className="text-2xl font-extrabold text-pink-dark">{pending.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 w-[200px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">With Blood Bank</p>
          <p className="text-2xl font-extrabold text-[#b9770e]">{inProgress.length}</p>
        </div>
        <Link to="/hospital/blood-bank" className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs block transition-all hover:border-pink group">
          <p className="text-muted text-xs mb-1 font-semibold flex items-center justify-between">
            <span>Linked Blood Bank</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className={linkedBank ? 'text-base font-extrabold leading-snug text-ink group-hover:text-pink-dark transition-colors line-clamp-2' : 'text-sm font-extrabold text-muted'}>
            {linkedBank ? linkedBank.org_name : 'Not linked'}
          </p>
        </Link>
      </div>

      {/* Pending Blood Requests */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Pending Blood Requests</h2>
            <p className="text-muted text-xs">Patient requests waiting for hospital doctor / staff review.</p>
          </div>
          <Link to="/hospital/requests/pending" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>View All ({pending.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No pending patient requests right now.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                  <th className="text-left px-5 py-3.5">Patient</th>
                  <th className="text-left px-5 py-3.5">Blood</th>
                  <th className="text-left px-5 py-3.5">Units</th>
                  <th className="text-left px-5 py-3.5">Urgency</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-left px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((req) => (
                  <tr key={req.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-ink">{req.patient_name}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                        {req.blood_group_required}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{req.units_required} unit(s)</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${urgencyBadge[req.priority]}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/hospital/requests/review?id=${req.id}`}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* With Blood Bank */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">With the Blood Bank</h2>
            <p className="text-muted text-xs">
              Requests forwarded to your linked blood bank and their live fulfillment status.
            </p>
          </div>
          {awaitingReceipt.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ffe1e1] text-[#d5233f] border border-red-200 animate-pulse">
              {awaitingReceipt.length} awaiting your receipt confirmation
            </span>
          )}
        </div>

        {inProgress.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            Nothing with the blood bank right now. Verified requests appear here until you confirm receipt.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {inProgress.map((req) => {
              const stage = hospitalStage(req)
              return (
                <div key={req.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all duration-150 hover:border-slate-300">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <p className="text-sm font-bold text-ink">
                        {req.patient_name} · <span className="text-pink-dark font-extrabold">{req.blood_group_required}</span> × {req.units_required} unit(s)
                      </p>
                      <p className="text-muted text-xs mt-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{req.assigned_blood_bank?.org_name ?? 'Awaiting blood bank pickup'}</span>
                        {req.assigned_blood_bank?.poc_contact && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            · <Phone className="w-3 h-3 text-slate-400" /> {req.assigned_blood_bank.poc_contact}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[req.priority]}`}>
                      {req.priority}
                    </span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fff1d6] text-[#b9770e] border border-amber-200">
                      {stage.label}
                    </span>
                    {stage.action === 'confirm' && (
                      <Link
                        to={`/hospital/requests/confirm-received?id=${req.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold bg-pink text-white shadow-xs transition-all hover:-translate-y-px hover:bg-pink-dark"
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
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}
