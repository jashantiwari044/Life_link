import { useEffect, useState } from 'react'
import {
  HeartHandshake,
  Mail,
  Phone,
  User,
  MapPin,
  FileText,
  Pencil,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import AddressField from '../../components/AddressField.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { orgsApi, ApiError } from '../../api/index.js'
import { isRequired, isValidPhone } from '../../utils/validators.js'
import { labelClass, errorClass, inputCls, disabledInputClass } from '../../constants/formStyles.js'

export default function NgoProfile() {
  const [org, setOrg] = useState(null)
  const [values, setValues] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    orgsApi.getMe().then((data) => {
      setOrg(data)
      setValues({
        org_name: data.org_name,
        poc_name: data.poc_name,
        poc_contact: data.poc_contact,
        address: data.address || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      })
    })
  }, [])

  function handleStartEdit() {
    if (!org) return
    setValues({
      org_name: org.org_name,
      poc_name: org.poc_name,
      poc_contact: org.poc_contact,
      address: org.address || '',
      latitude: org.latitude ?? null,
      longitude: org.longitude ?? null,
    })
    setErrors({})
    setSubmitError('')
    setSaved(false)
    setIsEditing(true)
  }

  function handleCancelEdit() {
    if (!org) return
    setValues({
      org_name: org.org_name,
      poc_name: org.poc_name,
      poc_contact: org.poc_contact,
      address: org.address || '',
      latitude: org.latitude ?? null,
      longitude: org.longitude ?? null,
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
    if (!isRequired(values.org_name)) nextErrors.org_name = 'NGO name is required.'
    if (!isRequired(values.poc_name)) nextErrors.poc_name = 'Point of contact is required.'
    if (!isRequired(values.poc_contact)) {
      nextErrors.poc_contact = 'Contact number is required.'
    } else if (!isValidPhone(values.poc_contact)) {
      nextErrors.poc_contact = 'Enter a valid 10-digit phone number.'
    }
    if (!isRequired(values.address)) nextErrors.address = 'Address is required.'
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
      const updated = await orgsApi.updateMe(values)
      setOrg(updated)
      setSaved(true)
      setIsEditing(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not save changes.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!org || !values) {
    return (
      <DashboardLayout active="Profile" links={ngoSidebarLinks}>
        <p className="text-muted py-8">Loading NGO profile…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="Profile" links={ngoSidebarLinks} user={{ name: org.org_name }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 max-w-[620px]">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">NGO Profile</h1>
          <p className="text-muted text-sm">
            {isEditing ? 'Update your organization and point of contact details.' : "View and manage your NGO's registered details."}
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
            <span>NGO profile updated successfully!</span>
          </div>
          <button type="button" onClick={() => setSaved(false)} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {!isEditing ? (
        /* VIEW MODE */
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[620px] shadow-xs flex flex-col gap-6">
          {/* Top Organization Summary Card */}
          <div className="flex items-center gap-4 pb-6 border-b border-line">
            <div className="w-14 h-14 rounded-2xl bg-pink-light text-pink-dark font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink truncate">{org.org_name}</h2>
              <p className="text-xs text-muted truncate">{org.email}</p>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {org.org_type || 'NGO'}
            </span>
          </div>

          {/* Details List */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-slate-400" />
                <span>Organization Name</span>
              </span>
              <span className="text-sm font-bold text-ink">{org.org_name}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>HRF Registration No.</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-pink-light text-pink-dark border border-pink/20">
                  {org.registration_number_hrf_id}
                </span>
                <Lock className="w-3 h-3 text-slate-400" title="Fixed (cannot be changed)" />
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Point of Contact</span>
              </span>
              <span className="text-sm font-bold text-ink">{org.poc_name}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Contact Number</span>
              </span>
              <span className="text-sm font-bold text-ink">{org.poc_contact}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-line/60">
              <span className="text-xs font-semibold text-muted flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Registered Email</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{org.email}</span>
                <Lock className="w-3 h-3 text-slate-400" title="Fixed (cannot be changed)" />
              </div>
            </div>

            <div className="flex justify-between items-start py-2">
              <span className="text-xs font-semibold text-muted flex items-center gap-2 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Office Address</span>
              </span>
              <span className="text-sm font-medium text-ink text-right max-w-[280px]">
                {org.address || <span className="text-muted italic">No address provided</span>}
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
              <span>Edit NGO Details</span>
            </button>
          </div>
        </div>
      ) : (
        /* EDIT MODE */
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-pink/30 ring-2 ring-pink/10 rounded-2xl p-6 sm:p-8 max-w-[620px] shadow-xs flex flex-col gap-4"
          noValidate
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <p className="text-xs font-bold text-pink-dark uppercase tracking-wider">Editing NGO Profile</p>
            <span className="text-xs text-muted">HRF ID &amp; Email are permanent.</span>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="name" className={labelClass}>Organization Name</label>
            <input
              id="name"
              type="text"
              value={values.org_name}
              onChange={(e) => handleChange('org_name', e.target.value)}
              className={inputCls(errors, 'org_name')}
              placeholder="e.g. Red Cross Society Ranchi"
            />
            {errors.org_name && <span className={errorClass}>{errors.org_name}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="regNumber" className={labelClass}>Registration Number (HRF ID - Read-only)</label>
            <div className="relative">
              <input
                id="regNumber"
                type="text"
                value={org.registration_number_hrf_id}
                disabled
                className={disabledInputClass}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <span className="text-muted text-[11px]">HRF registration ID verified by admin cannot be edited.</span>
          </div>

          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="contactPerson" className={labelClass}>Point of Contact</label>
              <input
                id="contactPerson"
                type="text"
                value={values.poc_name}
                onChange={(e) => handleChange('poc_name', e.target.value)}
                className={inputCls(errors, 'poc_name')}
                placeholder="Coordinator Name"
              />
              {errors.poc_name && <span className={errorClass}>{errors.poc_name}</span>}
            </div>
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="phone" className={labelClass}>Contact Number</label>
              <input
                id="phone"
                type="tel"
                value={values.poc_contact}
                onChange={(e) => handleChange('poc_contact', e.target.value)}
                className={inputCls(errors, 'poc_contact')}
                placeholder="10-digit mobile"
              />
              {errors.poc_contact && <span className={errorClass}>{errors.poc_contact}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="email" className={labelClass}>Email Address (Read-only)</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={org.email}
                disabled
                className={disabledInputClass}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            <span className="text-muted text-[11px]">Organization login email.</span>
          </div>

          <AddressField
            id="address"
            label="Office Address"
            hint="Search your address — donors and partners get a map and directions to this pin."
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
