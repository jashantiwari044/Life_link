import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Building2,
  Plus,
  HeartHandshake,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { orgsApi, ngoApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const priorityBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

const urgencyBadge = {
  CRITICAL: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  HIGH: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border border-blue-200',
}

export default function NgoDashboard() {
  const [org, setOrg] = useState(null)
  const [drives, setDrives] = useState([])
  const [myResponses, setMyResponses] = useState([])
  const [shortageAlerts, setShortageAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    Promise.all([
      orgsApi.getMe(),
      ngoApi.listMyCamps(),
      ngoApi.getMyResponses(),
      ngoApi.listShortageAlerts(),
    ])
      .then(([orgData, campData, responseData, alertsData]) => {
        setOrg(orgData)
        setDrives(campData || [])
        setMyResponses(responseData || [])
        setShortageAlerts(Array.isArray(alertsData) ? alertsData : [])
      })
      .catch((err) => setLoadError(describeError(err, 'Could not load the dashboard.')))
      .finally(() => setLoading(false))
  }, [])

  if (loading || loadError) {
    return (
      <DashboardLayout active="Dashboard" links={ngoSidebarLinks}>
        <LoadError message={loadError} />
        {loading && <p className="text-muted py-8">Loading NGO dashboard…</p>}
      </DashboardLayout>
    )
  }

  // Split responses: pending (still to donate) vs completed
  const pendingResponses = myResponses.filter((r) => r.status === 'ACCEPTED')
  const completedResponses = myResponses.filter((r) => r.status === 'BLOOD_COLLECTED')

  return (
    <DashboardLayout active="Dashboard" links={ngoSidebarLinks} user={{ name: org.org_name }}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Welcome, {org.org_name} 👋
        </h1>
        <p className="text-muted text-sm">NGO blood drives coordinator and community response operations.</p>
      </div>

      {/* Top KPI Cards */}
      <div className="flex gap-4 flex-wrap mb-10">
        <Link
          to="/ngo/drives"
          className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs transition-all hover:border-pink group block"
        >
          <div className="flex justify-between items-start">
            <p className="text-muted text-xs mb-1 font-semibold">Donation Drives</p>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{drives.length}</p>
          <p className="text-[11px] text-muted mt-1">
            {drives.filter((d) => d.status !== 'COMPLETED').length} active · {drives.filter((d) => d.status === 'COMPLETED').length} completed
          </p>
        </Link>

        <Link
          to="/ngo/my-responses"
          className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs transition-all hover:border-pink group block"
        >
          <div className="flex justify-between items-start">
            <p className="text-muted text-xs mb-1 font-semibold">Requests Accepted</p>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-2xl font-extrabold text-[#b9770e]">{pendingResponses.length}</p>
          <p className="text-[11px] text-muted mt-1">Awaiting collection</p>
        </Link>

        <Link
          to="/ngo/shortages"
          className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs transition-all hover:border-pink group block"
        >
          <div className="flex justify-between items-start">
            <p className="text-muted text-xs mb-1 font-semibold">Shortage Alerts</p>
            <ArrowRight className="w-3.5 h-3.5 text-pink opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">
            {shortageAlerts.filter((a) => a.status === 'OPEN').length}
          </p>
          <p className="text-[11px] text-muted mt-1">
            {shortageAlerts.length} total broadcasted
          </p>
        </Link>
      </div>

      {/* Blood Bank Shortage Alerts */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Blood Bank Shortage Alerts</span>
            </h2>
            <p className="text-muted text-xs">
              Urgent blood stock shortages reported by blood banks. Schedule drives to respond.
            </p>
          </div>
          <Link to="/ngo/shortages" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>View All Alerts ({shortageAlerts.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {shortageAlerts.filter((a) => a.status === 'OPEN').length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No active open shortage alerts from blood banks at the moment.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {shortageAlerts
              .filter((a) => a.status === 'OPEN')
              .slice(0, 3)
              .map((alert) => (
                <div
                  key={alert.id}
                  className="bg-white border border-line rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between flex-wrap gap-4"
                >
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-extrabold text-pink-dark">
                        {alert.blood_group === 'ALL' ? 'ALL Groups' : alert.blood_group}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        · {alert.units_needed} units needed
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyBadge[alert.urgency] ?? 'bg-slate-100 text-slate-700'}`}>
                        {alert.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 mb-1">
                      {alert.message}
                    </p>
                    <p className="text-[11px] text-muted flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      <span>{alert.blood_bank?.org_name ?? `Blood Bank #${alert.blood_bank_id}`}</span>
                      <span>· {formatDate(alert.created_at)}</span>
                    </p>
                  </div>

                  <Link
                    to="/ngo/drives/publish"
                    state={{ shortageAlert: alert }}
                    className="inline-flex items-center justify-center gap-1 rounded-full px-4 py-2 text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Organize Drive</span>
                  </Link>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* My Accepted Requests */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">My Accepted Requests</h2>
            <p className="text-muted text-xs">
              Blood requests your organization has committed to fulfill.
            </p>
          </div>
          <Link to="/ngo/requests" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>Browse Open Requests</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {pendingResponses.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No active commitments right now.{' '}
            <Link to="/ngo/requests" className="text-pink-dark font-semibold hover:underline">
              Browse open emergency requests →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {pendingResponses.slice(0, 5).map((resp) => {
              const req = resp.request
              return (
                <div key={resp.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <p className="text-sm font-bold text-ink">
                        {req?.patient_name ?? `Request #${resp.request_id}`}
                        {req?.blood_group_required ? ` · ${req.blood_group_required} × ${req.units_required} unit(s)` : ''}
                      </p>
                      <p className="text-muted text-xs mt-1">
                        {req?.hospital?.org_name ?? 'No hospital listed'}
                        {req?.assigned_blood_bank?.org_name
                          ? ` · Collection: ${req.assigned_blood_bank.org_name}`
                          : ''}
                      </p>
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
        )}
      </section>

      {/* Donation Drives Overview Card */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink">Donation Drives</h2>
            <p className="text-muted text-xs">Overview of blood donation drives organized by your NGO.</p>
          </div>
          <Link to="/ngo/drives" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>Manage Drives ({drives.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold text-ink mb-1">Organize &amp; Track Donation Camps</h3>
            <p className="text-muted text-xs sm:text-sm max-w-[500px] leading-relaxed">
              Publish public donation drives with date and venue, view registered attendees, and mark drives completed once finished.
            </p>
            <div className="flex items-center gap-4 mt-3 flex-wrap text-xs">
              <span className="font-bold text-[#1f8a3d] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1f8a3d]" />
                <span>{drives.filter((d) => d.status !== 'COMPLETED').length} Active Drives</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{drives.filter((d) => d.status === 'COMPLETED').length} Completed</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <Link
              to="/ngo/drives/publish"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark"
            >
              <Plus className="w-4 h-4" />
              <span>Create Drive</span>
            </Link>
            <Link
              to="/ngo/drives"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-bold bg-white text-ink border border-line transition-all hover:border-pink hover:text-pink-dark"
            >
              View All Drives →
            </Link>
          </div>
        </div>
      </section>
    </DashboardLayout>
  )
}
