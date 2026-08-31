import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { isRequired, isValidPhone } from '../utils/validators.js'
import { bloodRequestsApi, authApi, usersApi, ApiError } from '../api/index.js'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const urgencyLevels = ['Normal', 'Urgent', 'Emergency']
const urgencyToPriority = { Normal: 'PLANNED', Urgent: 'URGENT', Emergency: 'EMERGENCY' }

const inputClass =
  'border rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink'
const labelClass = 'text-[13px] font-semibold text-ink'
const errorClass = 'text-pink-dark text-xs font-semibold'

const initialValues = {
  patientName: '',
  bloodGroup: '',
  units: '',
  urgency: 'Normal',
  hospital: '',
  contact: '',
  notes: '',
}

export default function RequestBlood() {
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [hospitals, setHospitals] = useState([])
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    authApi.listHospitals().then(setHospitals).catch(() => setHospitals([]))
  }, [])

  // Seed the form from the signed-in profile so the user is not retyping data
  // they already gave at registration. Every field stays editable — people do
  // raise requests on behalf of a relative.
  useEffect(() => {
    let cancelled = false
    usersApi
      .getMe()
      .then((profile) => {
        if (cancelled || !profile) return
        setValues((v) => ({
          ...v,
          patientName: v.patientName || profile.full_name || '',
          bloodGroup: v.bloodGroup || profile.blood_group || '',
          contact: v.contact || profile.phone_number || '',
        }))
        setPrefilled(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function inputCls(name) {
    return `${inputClass} ${errors[name] ? 'border-pink-dark' : 'border-line'}`
  }

  function validate() {
    const nextErrors = {}
    if (!isRequired(values.patientName)) nextErrors.patientName = 'Patient name is required.'
    if (!isRequired(values.bloodGroup)) nextErrors.bloodGroup = 'Select a blood group.'
    if (!isRequired(values.units)) {
      nextErrors.units = 'Units required is required.'
    } else if (Number(values.units) <= 0) {
      nextErrors.units = 'Enter a valid number of units.'
    }
    if (!isRequired(values.hospital)) nextErrors.hospital = 'Please select a hospital.'
    if (!isRequired(values.contact)) {
      nextErrors.contact = 'Contact number is required.'
    } else if (!isValidPhone(values.contact)) {
      nextErrors.contact = 'Enter a valid 10-digit phone number.'
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
      await bloodRequestsApi.create({
        patient_name: values.patientName,
        blood_group_required: values.bloodGroup,
        units_required: Number(values.units),
        hospital_id: Number(values.hospital) || undefined,
        priority: urgencyToPriority[values.urgency],
        emergency_reason: values.urgency === 'Emergency' ? values.notes || undefined : undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not submit the request. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout active="Request Blood">
      <h1 className="text-[26px] font-extrabold mb-[6px]">Request Blood</h1>
      <p className="text-muted mb-6">
        Fill in the details below and we'll notify nearby donors and blood banks.
      </p>

      {!submitted && prefilled && (
        <p className="text-muted text-[13px] mb-4 bg-pink-light text-pink-dark rounded-[10px] px-4 py-[10px] inline-block">
          We've filled in your own details — change them if you're requesting for someone else.
        </p>
      )}

      {submitted ? (
        <div className="bg-white border border-line rounded-2xl p-8 max-w-[560px] shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <CheckCircle2 className="w-6 h-6 text-[#1f8a3d]" />
            <p className="text-xl font-bold text-ink">Request Submitted</p>
          </div>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Your request for {values.units} unit(s) of {values.bloodGroup} blood has been registered.
            The hospital has been notified and you can track its status live from My Requests.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-bold bg-pink text-white shadow-[0_4px_16px_rgba(242,70,125,0.3)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark"
            onClick={() => navigate('/my-requests')}
          >
            Go to My Requests →
          </button>
        </div>
      ) : (
        <form
          className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[560px] flex flex-col gap-4 shadow-xs"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="patientName" className={labelClass}>Patient Name</label>
            <input
              id="patientName"
              type="text"
              placeholder="Jane Doe"
              value={values.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              className={inputCls('patientName')}
            />
            {errors.patientName && <span className={errorClass}>{errors.patientName}</span>}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="bloodGroup" className={labelClass}>Blood Group</label>
              <select
                id="bloodGroup"
                value={values.bloodGroup}
                onChange={(e) => handleChange('bloodGroup', e.target.value)}
                className={inputCls('bloodGroup')}
              >
                <option value="" disabled>Select</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              {errors.bloodGroup && <span className={errorClass}>{errors.bloodGroup}</span>}
            </div>
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="units" className={labelClass}>Units Required</label>
              <input
                id="units"
                type="number"
                min="1"
                placeholder="2"
                value={values.units}
                onChange={(e) => handleChange('units', e.target.value)}
                className={inputCls('units')}
              />
              {errors.units && <span className={errorClass}>{errors.units}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="urgency" className={labelClass}>Urgency</label>
            <select
              id="urgency"
              value={values.urgency}
              onChange={(e) => handleChange('urgency', e.target.value)}
              className={inputCls('urgency')}
            >
              {urgencyLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="hospital" className={labelClass}>Hospital Name</label>
            <select
              id="hospital"
              value={values.hospital}
              onChange={(e) => handleChange('hospital', e.target.value)}
              className={inputCls('hospital')}
            >
              <option value="" disabled>Select a hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.org_name}</option>
              ))}
            </select>
            {errors.hospital && <span className={errorClass}>{errors.hospital}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="contact" className={labelClass}>Contact Number</label>
            <input
              id="contact"
              type="tel"
              placeholder="9000000000"
              value={values.contact}
              onChange={(e) => handleChange('contact', e.target.value)}
              className={inputCls('contact')}
            />
            {errors.contact && <span className={errorClass}>{errors.contact}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="notes" className={labelClass}>Additional Notes</label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Any additional information for donors or the hospital"
              value={values.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className={`${inputClass} border-line resize-none`}
            />
          </div>

          {submitError && <p className={errorClass}>{submitError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full text-[15px] font-semibold bg-pink text-white shadow-[0_8px_20px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark w-full mt-1 p-[13px] disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>
      )}
    </DashboardLayout>
  )
}
