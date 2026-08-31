import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Droplet,
  HeartHandshake,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { adminApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

export default function AdminUserDetails() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    adminApi
      .getUser(id)
      .then(setUser)
      .catch((err) => setLoadError(describeError(err, 'Could not load this user profile.')))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <DashboardLayout active="User Directory" links={adminSidebarLinks}>
      <div className="mb-6">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-pink-dark transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Directory</span>
        </Link>
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          User Account Profile
        </h1>
        <p className="text-muted text-sm">Full identity, contact details, and platform registration data.</p>
      </div>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted py-8">Loading user details…</p>
      ) : !user ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          User account not found or invalid user ID.
        </div>
      ) : (
        <div className="max-w-[720px] flex flex-col gap-6">
          {/* Header Card */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-pink-light text-pink-dark flex items-center justify-center font-extrabold text-xl shrink-0">
                {user.full_name
                  ?.split(' ')
                  .map((w) => w[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-ink">{user.full_name}</h2>
                <p className="text-xs text-muted mt-0.5">Platform User ID: #{user.id}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                    Blood Group: {user.blood_group}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-0.5 rounded-full border ${
                      user.donor_mode_enabled
                        ? 'bg-[#e3f5e8] text-[#1f8a3d] border-green-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Donor Mode: {user.donor_mode_enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="bg-white border border-line rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-ink mb-4 pb-2 border-b border-line">
              Demographic &amp; Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-line">
                <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
                  <Mail className="w-3.5 h-3.5 text-pink-dark" />
                  <span>Email Address</span>
                </div>
                <p className="font-bold text-ink">{user.email}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-line">
                <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
                  <Phone className="w-3.5 h-3.5 text-pink-dark" />
                  <span>Phone Number</span>
                </div>
                <p className="font-bold text-ink">{user.phone_number}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-line">
                <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
                  <Calendar className="w-3.5 h-3.5 text-pink-dark" />
                  <span>Date of Birth</span>
                </div>
                <p className="font-bold text-ink">{user.dob ? formatDate(user.dob) : '—'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-line">
                <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
                  <Calendar className="w-3.5 h-3.5 text-pink-dark" />
                  <span>Registration Date</span>
                </div>
                <p className="font-bold text-ink">{formatDate(user.created_at)}</p>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-line">
              <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
                <MapPin className="w-3.5 h-3.5 text-pink-dark" />
                <span>Permanent Address</span>
              </div>
              <p className="font-bold text-ink">{user.address || '—'}</p>
            </div>

            {user.aadhaar_number_redacted && (
              <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-line flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-muted text-xs font-semibold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1f8a3d]" />
                    <span>Identity Verification (Aadhaar Redacted)</span>
                  </div>
                  <p className="font-bold text-ink tracking-wider">{user.aadhaar_number_redacted}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
                  Verified
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
