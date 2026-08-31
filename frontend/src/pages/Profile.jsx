import { useEffect, useState } from 'react'
import {
  User,
  Mail,
  Droplet,
  Phone,
  MapPin,
  Pencil,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import AddressField from '../components/AddressField.jsx'
import { usersApi, ApiError } from '../api/index.js'
import { isRequired, isValidPhone } from '../utils/validators.js'
import { labelClass, errorClass, inputCls, disabledInputClass } from '../constants/formStyles.js'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [values, setValues] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    usersApi.getMe().then((data) => {
      setProfile(data)
      setValues({
        fullName: data.full_name,
        bloodGroup: data.blood_group,
        phoneNumber: data.phone_number,
        address: data.address || '',
        latitude: data.current_lat ?? null,
        longitude: data.current_lng ?? null,
      })
    })
  }, [])

  function handleStartEdit() {
    if (!profile) return
    setValues({
      fullName: profile.full_name,
      bloodGroup: profile.blood_group,
      phoneNumber: profile.phone_number,
      address: profile.address || '',
      latitude: profile.current_lat ?? null,
      longitude: profile.current_lng ?? null,
    })
    setErrors({})
    setSubmitError('')
    setSaved(false)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (!profile) return
    setValues({
      fullName: profile.full_name,
      bloodGroup: profile.blood_group,
      phoneNumber: profile.phone_number,
      address: profile.address || '',
      latitude: profile.current_lat ?? null,
      longitude: profile.current_lng ?? null,
    })
    setErrors({})
    setSubmitError('')
    setIsEditing(false)
  }

  function handleChange(field, val) {
    setValues((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    setSaved(false)
  }

  function validate() {
    const errs = {}
    if (!isRequired(values.fullName)) errs.fullName = 'Full name is required.'
    if (!isValidPhone(values.phoneNumber)) errs.phoneNumber = 'Enter a valid 10-digit phone number.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSubmitting(true)
    try {
      const updated = await usersApi.updateMe({
        full_name: values.fullName,
        phone_number: values.phoneNumber,
        address: values.address || undefined,
        // Same pin drives the nearby-SOS matching the dashboard already does.
        current_lat: values.latitude ?? undefined,
        current_lng: values.longitude ?? undefined,
      })
      setProfile(updated)
      setSaved(true)
      setIsEditing(false)
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.detail?.detail ?? err.message
          : 'Could not update your profile.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!profile || !values) {
    return (
      <DashboardLayout active="Profile">
        <p className="text-muted py-8">Loading profile…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="Profile">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 max-w-[620px]">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">My Profile</h1>
          <p className="text-muted text-sm">
            {isEditing ? 'Update your personal and contact information.' : 'View and manage your donor account details.'}
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
        <div className="mb-6 p-4 rounded-2xl bg-[#e3f5e8] border border-[#86efac] text-[#1f8a3d] text-sm font-semibold flex items-center justify-between shadow-xs max-w-[620px]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Profile updated successfully!</span>
          </div>
          <button type="button" onClick={() => setSaved(false)} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {!isEditing ? (
        /* VIEW MODE */
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[620px] shadow-xs flex flex-col gap-6">
          {/* Top Profile Summary Card */}
          <div className="flex items-center gap-4 pb-6 border-b border-line">
            <div className="w-14 h-14 rounded-2xl bg-pink-light text-pink-dark font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink truncate">{profile.full_name}</h2>
              <p className="text-xs text-muted truncate">{profile.email}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
              <Droplet className="w-3.5 h-3.5 fill-pink-dark" />
              <span>{profile.blood_group}</span>
            </div>
          </div>

          {/* Details List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Full Name</span>
              </span>
              <span className="text-sm font-bold text-ink">{profile.full_name}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email Address</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{profile.email}</span>
                <Lock className="w-3 h-3 text-slate-400" title="Fixed (cannot be changed)" />
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Droplet className="w-4 h-4 text-pink-dark" />
                <span>Blood Group</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-pink-dark">{profile.blood_group}</span>
                <Lock className="w-3 h-3 text-slate-400" title="Fixed (cannot be changed)" />
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Phone Number</span>
              </span>
              <span className="text-sm font-bold text-ink">{profile.phone_number || '—'}</span>
            </div>

            <div className="flex justify-between items-start py-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-2 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Address</span>
              </span>
              <span className="text-sm font-medium text-ink text-right max-w-[280px]">
                {profile.address || <span className="text-muted italic">No address provided</span>}
              </span>
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
          className="bg-white border border-pink/30 ring-2 ring-pink/10 rounded-2xl p-6 sm:p-8 max-w-[620px] shadow-xs flex flex-col gap-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <p className="text-xs font-bold text-pink-dark uppercase tracking-wider">Editing Donor Profile</p>
            <span className="text-xs text-muted">Fields marked with lock cannot be altered.</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="fullName" className={labelClass}>Full Name</label>
            <input
              id="fullName"
              type="text"
              value={values.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className={inputCls(errors, 'fullName')}
              placeholder="e.g. John Doe"
            />
            {errors.fullName && <span className={errorClass}>{errors.fullName}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="email" className={labelClass}>Email Address (Read-only)</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className={disabledInputClass}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <span className="text-muted text-[11px]">Primary email cannot be changed.</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="bloodGroup" className={labelClass}>Blood Group (Read-only)</label>
            <div className="relative">
              <input
                id="bloodGroup"
                type="text"
                value={values.bloodGroup}
                disabled
                className={disabledInputClass}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <span className="text-muted text-[11px]">Blood group cannot be changed after registration.</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="phoneNumber" className={labelClass}>Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              value={values.phoneNumber}
              onChange={(e) => handleChange('phoneNumber', e.target.value)}
              className={inputCls(errors, 'phoneNumber')}
              placeholder="10-digit mobile number"
            />
            {errors.phoneNumber && <span className={errorClass}>{errors.phoneNumber}</span>}
          </div>

          <AddressField
            id="address"
            label="Address"
            hint="Search your address — this also helps us match you to nearby SOS requests."
            value={values.address}
            latitude={values.latitude}
            longitude={values.longitude}
            error={errors.address}
            labelClass={labelClass}
            errorClass={errorClass}
            inputClassName={inputCls(errors, 'address')}
            onChange={({ address, latitude, longitude }) =>
              setValues((v) => ({ ...v, address, latitude, longitude }))
            }
          />

          {submitError && <p className={errorClass}>{submitError}</p>}

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
