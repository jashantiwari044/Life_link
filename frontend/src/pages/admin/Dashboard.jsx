import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Building2,
  CheckCircle2,
  Tent,
  ArrowRight,
  ShieldAlert,
  FileBarChart,
  TrendingUp,
  MapPin,
  Phone,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import OrgDetailModal from '../../components/OrgDetailModal.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { usersApi, adminApi, describeError } from '../../api/index.js'

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null)
  const [stats, setStats] = useState(null)
  const [activeOrgs, setActiveOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [revokingOrg, setRevokingOrg] = useState(null)
  const [revokeError, setRevokeError] = useState('')
  const [selectedOrg, setSelectedOrg] = useState(null)

  useEffect(() => {
    Promise.all([
      usersApi.getMe(),
      adminApi.getStats(),
      adminApi.getActiveOrganizations(),
    ])
      .then(([adminData, statsData, active]) => {
        setAdmin(adminData)
        setStats(statsData)
        setActiveOrgs(active)
      })
      .catch((err) => setLoadError(describeError(err, 'Could not load the dashboard.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleRevoke(org) {
    try {
      setRevokeError('')
      await adminApi.revokeOrg(org.id)
      setActiveOrgs((list) => list.filter((o) => o.id !== org.id))
      setRevokingOrg(null)
    } catch (err) {
      setRevokeError(describeError(err, 'Could not revoke organization.'))
    }
  }

  if (loading || loadError) {
    return (
      <DashboardLayout active="Dashboard" links={adminSidebarLinks}>
        <LoadError message={loadError} />
        {loading && <p className="text-muted py-8">Loading admin dashboard…</p>}
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="Dashboard" links={adminSidebarLinks} user={{ name: admin?.full_name || 'Admin' }}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Welcome back, {admin?.full_name || 'Administrator'} 👋
        </h1>
        <p className="text-muted text-sm">
          Platform-wide controls, organization verifications, user directory, and live metrics.
        </p>
      </div>

      <LoadError message={loadError} />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Link
          to="/admin/users"
          className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-pink hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-500" />
              <span>Total Users</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-pink-dark group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{stats?.users_count?.toLocaleString() ?? 0}</p>
          <p className="text-[11px] text-[#1f8a3d] font-semibold mt-0.5">{stats?.donors_active_count ?? 0} active donors</p>
        </Link>

        <Link
          to="/admin/approvals/organizations"
          className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-pink hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-pink-dark" />
              <span>Organizations</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-pink-dark group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{stats?.organizations_count ?? 0}</p>
          <p className="text-[11px] text-amber-600 font-semibold mt-0.5">{stats?.pending_orgs_count ?? 0} pending review</p>
        </Link>

        <Link
          to="/admin/analytics"
          className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-pink hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#1f8a3d]" />
              <span>Fulfilled Blood</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-pink-dark group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-2xl font-extrabold text-[#1f8a3d]">{stats?.requests_fulfilled_count ?? 0}</p>
          <p className="text-[11px] text-muted font-medium mt-0.5">{stats?.requests_total_count ?? 0} total requests</p>
        </Link>

        <Link
          to="/admin/reports"
          className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-pink hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-muted text-xs font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <Tent className="w-4 h-4 text-purple-500" />
              <span>Donation Drives</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-pink-dark group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-2xl font-extrabold text-ink">{stats?.camps_run_count ?? 0}</p>
          <p className="text-[11px] text-muted font-medium mt-0.5">Partner NGO camps</p>
        </Link>
      </div>

      {/* Active Organizations Section */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-ink">Active Verified Organizations</h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
            {activeOrgs.length} Approved
          </span>
        </div>

        {activeOrgs.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
            No active organizations verified yet. Check Org Approvals to approve pending registrations.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeOrgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center gap-4 bg-white border border-line rounded-2xl p-5 shadow-xs flex-wrap transition-all hover:border-slate-300"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-sm shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base text-ink">{org.org_name}</p>
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {org.org_type}
                    </span>
                  </div>
                  <p className="text-muted text-xs mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-pink-dark shrink-0" />
                    <span>{org.address} · HRF: {org.registration_number_hrf_id}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>POC: {org.poc_name} ({org.poc_contact}) · {org.email}</span>
                  </p>
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedOrg(org)}
                    className="inline-flex items-center justify-center rounded-full font-bold bg-white text-ink border border-line px-4 py-2 text-xs transition-all hover:border-pink hover:text-pink-dark"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokingOrg(org)}
                    className="inline-flex items-center justify-center rounded-full font-bold bg-white text-[#d5233f] border border-red-200 px-4 py-2 text-xs transition-all hover:bg-red-50 hover:border-red-300"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Revoke confirmation dialog */}
      {revokingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] p-6">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-[#d5233f] flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-ink mb-2">Revoke Organization Access?</h3>
            <p className="text-muted text-xs mb-4">
              Are you sure you want to revoke <b>{revokingOrg.org_name}</b> ({revokingOrg.org_type})? Their portal access will be set back to Pending Review immediately.
            </p>
            {revokeError && <p className="text-[#d5233f] text-xs font-semibold mb-4">{revokeError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setRevokingOrg(null)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-white text-ink border border-line hover:border-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(revokingOrg)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[#d5233f] text-white hover:bg-red-700 transition-all shadow-xs"
              >
                Yes, Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal for an active organization */}
      <OrgDetailModal
        org={selectedOrg}
        open={selectedOrg !== null}
        onClose={() => setSelectedOrg(null)}
      />
    </DashboardLayout>
  )
}
