import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Mail,
  Phone,
  User,
  Pencil,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { usersApi, ApiError } from '../../api/index.js'
import { isRequired, isValidPhone } from '../../utils/validators.js'
import { labelClass, errorClass, inputCls, disabledInputClass } from '../../constants/formStyles.js'

export default function AdminProfile() {
  const [admin, setAdmin] = useState(null)
  const [values, setValues] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    usersApi.getMe().then((data) => {
      setAdmin(data)
      setValues({
        full_name: data.full_name,
        phone_number: data.phone_number || '',
      })
    })
  }, [])

  function handleStartEdit() {
    if (!admin) return
    setValues({
      full_name: admin.full_name,
      phone_number: admin.phone_number || '',
    })
    setErrors({})
    setSubmitError('')
    setSaved(false)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (!admin) return
    setValues({
      full_name: admin.full_name,
      phone_number: admin.phone_number || '',
    })
    setErrors({})
    setSubmitError('')
    setIsEditing(false)
  }

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
    setSaved(false)
  }

  function validate() {
    const nextErrors = {}
    if (!isRequired(values.full_name)) nextErrors.full_name = 'Name is required.'
    if (!isRequired(values.phone_number)) {
      nextErrors.phone_number = 'Phone number is required.'
    } else if (!isValidPhone(values.phone_number)) {
      nextErrors.phone_number = 'Enter a valid 10-digit phone number.'
    }
    return nextErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const updated = await usersApi.updateMe(values)
      setAdmin(updated)
      setSaved(true)
      setIsEditing(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not save changes.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!admin || !values) {
    return (
      <DashboardLayout active="Profile" links={adminSidebarLinks}>
        <p className="text-muted py-8">Loading admin profile…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="Profile" links={adminSidebarLinks} user={{ name: admin.full_name }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 max-w-[560px]">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Admin Profile</h1>
          <p className="text-muted text-sm">
            {isEditing ? 'Update your administrative account credentials.' : 'View and manage your platform administrator profile.'}
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {saved && !isEditing && (
        <div className="mb-6 p-4 rounded-2xl bg-[#e3f5e8] border border-[#86efac] text-[#1f8a3d] text-sm font-semibold flex items-center justify-between shadow-xs max-w-[560px]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Admin profile updated successfully!</span>
          </div>
          <button type="button" onClick={() => setSaved(false)} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {!isEditing ? (
        /* VIEW MODE */
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[560px] shadow-xs flex flex-col gap-6">
          {/* Top Profile Summary Card */}
          <div className="flex items-center gap-4 pb-6 border-b border-line">
            <div className="w-14 h-14 rounded-2xl bg-pink-light text-pink-dark font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink truncate">{admin.full_name}</h2>
              <p className="text-xs text-muted truncate">{admin.email}</p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-pink-light text-pink-dark border border-pink/20">
              ADMIN
            </span>
          </div>

          {/* Details List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Full Name</span>
              </span>
              <span className="text-sm font-bold text-ink">{admin.full_name}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email Address</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{admin.email}</span>
                <Lock className="w-3 h-3 text-slate-400" title="Fixed (cannot be changed)" />
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Phone Number</span>
              </span>
              <span className="text-sm font-bold text-ink">{admin.phone_number || '—'}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartEdit}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold bg-white text-ink border border-line transition-all hover:border-pink hover:text-pink-dark"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>
      ) : (
        /* EDIT MODE */
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-pink/30 ring-2 ring-pink/10 rounded-2xl p-6 sm:p-8 max-w-[560px] shadow-xs flex flex-col gap-4"
          noValidate
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <p className="text-xs font-bold text-pink-dark uppercase tracking-wider">Editing Admin Profile</p>
            <span className="text-xs text-muted">Email is permanent.</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="name" className={labelClass}>Full Name</label>
            <input
              id="name"
              type="text"
              value={values.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              className={inputCls(errors, 'full_name')}
              placeholder="Admin Name"
            />
            {errors.full_name && <span className={errorClass}>{errors.full_name}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="email" className={labelClass}>Email Address (Read-only)</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={admin.email}
                disabled
                className={disabledInputClass}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <span className="text-muted text-[11px]">Primary administrator email.</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="phone" className={labelClass}>Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={values.phone_number}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              className={inputCls(errors, 'phone_number')}
              placeholder="10-digit mobile number"
            />
            {errors.phone_number && <span className={errorClass}>{errors.phone_number}</span>}
          </div>

          {submitError && <span className={errorClass}>{submitError}</span>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={handleCancelEdit}
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-xs font-bold bg-white text-ink border border-line transition-all hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  )
}
