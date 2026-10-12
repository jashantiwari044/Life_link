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
  Plus,
  Droplet,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { orgsApi, hospitalApi, describeError } from '../../api/index.js'
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
  DISPATCHED: { label: 'In Transit', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  BLOOD_RECEIVED: { label: 'Received & Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function HospitalDashboard() {
  const [org, setOrg] = useState(null)
  const [requests, setRequests] = useState([])
  const [linkedBanks, setLinkedBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      orgsApi.getMe(),
      hospitalApi.listBloodRequests(),
      hospitalApi.getLinkedBloodBanks().catch(() => [])
    ])
      .then(([orgData, requestData, banks]) => {
        if (cancelled) return
        setOrg(orgData)
        setRequests(requestData || [])
        setLinkedBanks(Array.isArray(banks) ? banks : [])
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

  const activeRequisitions = requests.filter((r) => r.status !== 'BLOOD_RECEIVED' && r.status !== 'CANCELLED' && r.status !== 'REJECTED')
  const inTransit = requests.filter((r) => r.status === 'DISPATCHED')
  const completed = requests.filter((r) => r.status === 'BLOOD_RECEIVED')

  return (
    <DashboardLayout active="Dashboard" links={hospitalSidebarLinks} user={{ name: org.org_name }}>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Welcome, {org.org_name} 👋
          </h1>
          <p className="text-muted text-sm">Hospital Blood Requisitions &amp; Network Management Center.</p>
        </div>
        <Link
          to="/hospital/requests/new"
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Blood Requisition</span>
        </Link>
      </div>

      <LoadError message={loadError} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
        <Link to="/hospital/requests/pending" className="bg-white border border-line rounded-2xl p-5 shadow-xs block transition-all hover:border-pink group">
          <p className="text-muted text-xs mb-1 font-semibold flex items-center justify-between">
            <span>Active Requisitions</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-2xl font-extrabold text-pink-dark">{activeRequisitions.length}</p>
          <p className="text-[11px] text-muted mt-1">Units requested from banks</p>
        </Link>

        <Link to="/hospital/requests/pending" className="bg-white border border-line rounded-2xl p-5 shadow-xs block transition-all hover:border-pink group">
          <p className="text-muted text-xs mb-1 font-semibold flex items-center justify-between">
            <span>Blood in Transit</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-2xl font-extrabold text-purple-700">{inTransit.length}</p>
          <p className="text-[11px] text-muted mt-1">Awaiting delivery confirmation</p>
        </Link>

        <Link to="/hospital/blood-bank" className="bg-white border border-line rounded-2xl p-5 shadow-xs block transition-all hover:border-pink group">
          <p className="text-muted text-xs mb-1 font-semibold flex items-center justify-between">
            <span>Connected Blood Banks</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-2xl font-extrabold text-ink group-hover:text-pink-dark transition-colors">
            {linkedBanks.length}
          </p>
          <p className="text-[11px] text-muted mt-1">Active fulfillment partners</p>
        </Link>

        <Link to="/hospital/requests/history" className="bg-white border border-line rounded-2xl p-5 shadow-xs block transition-all hover:border-pink group">
          <p className="text-muted text-xs mb-1 font-semibold flex items-center justify-between">
            <span>Completed Receipts</span>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-2xl font-extrabold text-[#1f8a3d]">{completed.length}</p>
          <p className="text-[11px] text-muted mt-1">Units received successfully</p>
        </Link>
      </div>

      {/* Active Requisitions Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Active Blood Requisitions</h2>
            <p className="text-muted text-xs">
              Live requisitions sent to your connected blood banks and their real-time fulfillment status.
            </p>
          </div>
          <Link to="/hospital/requests/pending" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>View All ({activeRequisitions.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {activeRequisitions.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
            No active blood requisitions in flight. Need blood? Click "+ Raise Blood Requisition" above to request from a connected blood bank.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {activeRequisitions.slice(0, 5).map((req) => {
              const statusInfo = statusBadge[req.status] ?? { label: req.status, cls: 'bg-slate-100 text-slate-700 border-slate-200' }
              return (
                <div key={req.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
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

                    <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.assigned_blood_bank?.org_name ? `Target Bank: ${req.assigned_blood_bank.org_name}` : 'Pending Bank'}</span>
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Connected Blood Banks Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Connected Blood Banks</h2>
            <p className="text-muted text-xs">
              Blood banks your hospital is authorized to request blood from.
            </p>
          </div>
          <Link to="/hospital/blood-bank" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>Manage Connections</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {linkedBanks.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No blood banks connected yet. <Link to="/hospital/blood-bank" className="text-pink-dark font-bold hover:underline">Connect to Blood Banks</Link> to start raising requisitions.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedBanks.map((bank) => (
              <div key={bank.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-ink">{bank.org_name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Connected
                  </span>
                </div>
                <p className="text-xs text-muted mb-3 line-clamp-1">{bank.address || 'Address registered'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">{bank.poc_name || 'POC Available'}</span>
                  {bank.poc_contact && <span className="font-semibold text-slate-700">{bank.poc_contact}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}
