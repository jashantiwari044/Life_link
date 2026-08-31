import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  UserCheck,
  Droplet,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Eye,
  X,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import Modal from '../../components/Modal.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { adminApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [bloodFilter, setBloodFilter] = useState('ALL')
  const [donorFilter, setDonorFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)

  function loadUsers() {
    setLoading(true)
    setLoadError('')
    adminApi
      .listUsers(0, 100)
      .then(setUsers)
      .catch((err) => setLoadError(describeError(err, 'Could not load the user list.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone_number || '').toLowerCase().includes(q) ||
        (u.address || '').toLowerCase().includes(q)

      const matchesBlood = bloodFilter === 'ALL' || u.blood_group === bloodFilter

      const matchesDonor =
        donorFilter === 'ALL' ||
        (donorFilter === 'DONOR_ON' && u.donor_mode_enabled) ||
        (donorFilter === 'DONOR_OFF' && !u.donor_mode_enabled)

      return matchesSearch && matchesBlood && matchesDonor
    })
  }, [users, search, bloodFilter, donorFilter])

  const totalDonorsActive = users.filter((u) => u.donor_mode_enabled).length

  return (
    <DashboardLayout active="User Directory" links={adminSidebarLinks}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Registered Users Directory
          </h1>
          <p className="text-muted text-sm">
            All registered individuals and volunteer donors in the LifeLink network.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white text-ink border border-line shadow-xs hover:border-pink hover:text-pink-dark transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <LoadError message={loadError} />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Total Users</p>
          <p className="text-2xl font-extrabold text-ink">{users.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Active Donors</p>
          <p className="text-2xl font-extrabold text-[#1f8a3d]">{totalDonorsActive}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Donor Engagement</p>
          <p className="text-2xl font-extrabold text-pink-dark">
            {users.length > 0 ? `${Math.round((totalDonorsActive / users.length) * 100)}%` : '0%'}
          </p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Filtered Results</p>
          <p className="text-2xl font-extrabold text-blue-600">{filteredUsers.length}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-line rounded-2xl p-4 mb-6 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-line rounded-full pl-9 pr-4 py-2 text-xs font-medium text-ink placeholder:text-muted focus:outline-none focus:border-pink transition-all"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
          {/* Blood Group Filter */}
          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            aria-label="Filter by Blood Group"
            className="flex-1 sm:flex-initial bg-slate-50 border border-line rounded-full px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-pink"
          >
            <option value="ALL">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>

          {/* Donor Mode Filter */}
          <select
            value={donorFilter}
            onChange={(e) => setDonorFilter(e.target.value)}
            aria-label="Filter by Donor Status"
            className="flex-1 sm:flex-initial bg-slate-50 border border-line rounded-full px-3 py-2 text-xs font-semibold text-ink focus:outline-none focus:border-pink"
          >
            <option value="ALL">All Donor Modes</option>
            <option value="DONOR_ON">Donor Mode ON</option>
            <option value="DONOR_OFF">Donor Mode OFF</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading user directory…</p>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink mb-1">No Users Found</h3>
          <p className="text-muted text-xs">
            {search || bloodFilter !== 'ALL' || donorFilter !== 'ALL'
              ? 'No registered users match your search and filter criteria.'
              : 'No users registered on the platform yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout (Visible on Phones/Android) */}
          <div className="grid grid-cols-1 gap-3.5 md:hidden">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white border border-line rounded-2xl p-4 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-pink-light text-pink-dark flex items-center justify-center font-extrabold text-xs shrink-0">
                      {u.full_name
                        ?.split(' ')
                        .map((w) => w[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink text-sm truncate">{u.full_name}</p>
                      <p className="text-muted text-[11px]">ID: #{u.id} · {formatDate(u.created_at)}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20 shrink-0">
                    {u.blood_group}
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-xs text-muted pt-1 border-t border-slate-100">
                  <p className="font-medium text-slate-700 truncate">{u.email}</p>
                  <p className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{u.phone_number}</span>
                  </p>
                  {u.address && (
                    <p className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{u.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      u.donor_mode_enabled
                        ? 'bg-[#e3f5e8] text-[#1f8a3d] border-green-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.donor_mode_enabled ? 'bg-[#1f8a3d]' : 'bg-slate-400'
                      }`}
                    />
                    <span>{u.donor_mode_enabled ? 'Active Donor' : 'Standard'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-ink border border-line shadow-xs hover:border-pink hover:text-pink-dark transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                  <th className="text-left px-5 py-3.5">User</th>
                  <th className="text-left px-5 py-3.5">Contact</th>
                  <th className="text-left px-5 py-3.5">Blood Group</th>
                  <th className="text-left px-5 py-3.5">Donor Mode</th>
                  <th className="text-left px-5 py-3.5">Address</th>
                  <th className="text-left px-5 py-3.5">Joined</th>
                  <th className="text-left px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-pink-light text-pink-dark flex items-center justify-center font-extrabold text-xs shrink-0">
                          {u.full_name
                            ?.split(' ')
                            .map((w) => w[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-ink text-sm">{u.full_name}</p>
                          <p className="text-muted text-[11px]">ID: #{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-slate-700">{u.email}</p>
                      <p className="text-muted text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                        <span>{u.phone_number}</span>
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                        {u.blood_group}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          u.donor_mode_enabled
                            ? 'bg-[#e3f5e8] text-[#1f8a3d] border-green-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.donor_mode_enabled ? 'bg-[#1f8a3d]' : 'bg-slate-400'
                          }`}
                        />
                        <span>{u.donor_mode_enabled ? 'Active Donor' : 'Standard'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted max-w-[180px] truncate">
                      {u.address || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-ink border border-line shadow-xs hover:border-pink hover:text-pink-dark transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <Modal
          open={selectedUser !== null}
          title="User Account Details"
          onClose={() => setSelectedUser(null)}
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-white text-ink border border-line hover:border-pink hover:text-pink-dark transition-all"
              >
                Close
              </button>
              <Link
                to={`/admin/users/detail?id=${selectedUser.id}`}
                className="px-5 py-2 rounded-full text-xs font-bold bg-pink text-white hover:bg-pink-dark transition-all"
              >
                Full Profile Page
              </Link>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-pink-light/30 border border-pink-light">
              <div className="w-12 h-12 rounded-full bg-pink text-white flex items-center justify-center font-extrabold text-base shrink-0">
                {selectedUser.full_name
                  ?.split(' ')
                  .map((w) => w[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-ink">{selectedUser.full_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink text-white">
                    {selectedUser.blood_group}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedUser.donor_mode_enabled
                        ? 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    Donor Mode: {selectedUser.donor_mode_enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-line">
                <p className="text-muted font-semibold mb-0.5">Email Address</p>
                <p className="font-bold text-ink">{selectedUser.email}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-line">
                <p className="text-muted font-semibold mb-0.5">Phone Number</p>
                <p className="font-bold text-ink">{selectedUser.phone_number}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-line">
                <p className="text-muted font-semibold mb-0.5">Date of Birth</p>
                <p className="font-bold text-ink">{selectedUser.dob ? formatDate(selectedUser.dob) : '—'}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-line">
                <p className="text-muted font-semibold mb-0.5">Registered On</p>
                <p className="font-bold text-ink">{formatDate(selectedUser.created_at)}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-line text-xs">
              <p className="text-muted font-semibold mb-0.5">Residential Address</p>
              <p className="font-bold text-ink">{selectedUser.address || '—'}</p>
            </div>

            {selectedUser.aadhaar_number_redacted && (
              <div className="bg-slate-50 p-3 rounded-xl border border-line text-xs flex items-center justify-between">
                <div>
                  <p className="text-muted font-semibold mb-0.5">Aadhaar (Redacted)</p>
                  <p className="font-bold text-ink tracking-wider">
                    {selectedUser.aadhaar_number_redacted}
                  </p>
                </div>
                <ShieldCheck className="w-5 h-5 text-[#1f8a3d]" />
              </div>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  )
}
