import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Building2, Calendar, Plus, Clock, ShieldAlert, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { ngoApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const urgencyBadge = {
  CRITICAL: 'bg-[#ffe1e1] text-[#d5233f] border-red-200',
  HIGH: 'bg-[#fff1d6] text-[#b9770e] border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
}

const statusBadge = {
  ACTIVE: 'bg-amber-50 text-amber-700 border-amber-200',
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  DRIVE_SCHEDULED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RESOLVED: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function NgoShortages() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('ALL')

  async function loadAlerts() {
    const data = await ngoApi.listShortageAlerts()
    setAlerts(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    loadAlerts()
      .catch((err) => setLoadError(describeError(err, 'Could not load shortage alerts.')))
      .finally(() => setLoading(false))
  }, [])

  const filteredAlerts = useMemo(() => {
    if (filter === 'ALL') return alerts
    return alerts.filter((a) => a.urgency === filter)
  }, [alerts, filter])

  const openCount = alerts.filter((a) => a.status === 'ACTIVE' || a.status === 'OPEN').length

  return (
    <DashboardLayout active="Shortage Alerts" links={ngoSidebarLinks}>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            <span>Blood Bank Shortage Alerts</span>
          </h1>
          <p className="text-muted text-sm">
            Partnering blood banks broadcast urgent shortage alerts here so your NGO can mobilize donation drives.
          </p>
        </div>

        <Link
          to="/ngo/drives/publish"
          className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark"
        >
          <Plus className="w-4 h-4" />
          <span>Organize Independent Drive</span>
        </Link>
      </div>

      <LoadError message={loadError} />

      {openCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 sm:p-5 mb-6 flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
          <p className="text-sm font-bold text-amber-900">
            {openCount} urgent shortage alert{openCount > 1 ? 's' : ''} awaiting mobilization from blood banks.
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === f ? 'bg-pink text-white shadow-xs' : 'bg-white text-ink border border-line hover:border-pink'
            }`}
          >
            {f === 'ALL' ? `All Alerts (${alerts.length})` : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading shortage alerts…</p>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          No shortage alerts matching this filter.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredAlerts.map((alert) => {
            const isOpen = alert.status === 'ACTIVE' || alert.status === 'OPEN'
            return (
              <div
                key={alert.id}
                className="bg-white border border-line rounded-2xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    <span className="text-xl font-black text-pink-dark">
                      {alert.blood_group === 'ALL' ? 'ALL Groups (General Shortage)' : `${alert.blood_group} Blood`}
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      · {alert.units_needed} units needed
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgencyBadge[alert.urgency] ?? 'bg-slate-100 text-slate-700'}`}>
                      {alert.urgency}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[alert.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {alert.status === 'DRIVE_SCHEDULED' ? 'Drive Scheduled 🎉' : alert.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mb-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    "{alert.message}"
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{alert.blood_bank?.org_name ?? `Blood Bank #${alert.blood_bank_id}`}</span>
                    </span>
                    {alert.blood_bank?.address && (
                      <span className="text-slate-400 truncate max-w-xs">
                        · {alert.blood_bank.address}
                      </span>
                    )}
                    <span className="text-slate-400">
                      · {formatDate(alert.created_at)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  {isOpen ? (
                    <Link
                      to="/ngo/drives/publish"
                      state={{ shortageAlert: alert }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Schedule Drive for this Bank</span>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span>Drive Mobilized</span>
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
