import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, Stethoscope, HeartHandshake } from 'lucide-react'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import AddressField from '../components/AddressField.jsx'
import {
  isRequired,
  isValidEmail,
  isValidPhone,
  isValidPassword,
} from '../utils/validators.js'
import { useAuth } from '../context/AuthContext.jsx'
import { ApiError } from '../api/index.js'

const orgTypes = [
  { value: 'hospital', label: 'Hospital', icon: Stethoscope },
  { value: 'bloodbank', label: 'Blood Bank', icon: Building2 },
  { value: 'ngo', label: 'NGO', icon: HeartHandshake },
]

const orgTypeToBackend = {
  hospital: 'HOSPITAL',
  bloodbank: 'BLOOD_BANK',
  ngo: 'NGO',
}

const inputClass =
  'border rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink'
const labelClass = 'text-[13px] font-semibold text-ink'
const errorClass = 'text-pink-dark text-xs font-semibold'

const initialValues = {
  orgName: '',
  pocName: '',
  orgContact: '',
  orgEmail: '',
  regNumber: '',
  orgAddress: '',
  orgAddressLat: null,
  orgAddressLng: null,
  password: '',
  confirmPassword: '',
}

export default function Register() {
  const navigate = useNavigate()
  const { registerOrganization } = useAuth()
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role')
  const [orgType, setOrgType] = useState(
    orgTypes.some((t) => t.value === initialRole) ? initialRole : 'hospital',
  )
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [docName, setDocName] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const nextErrors = {}

    if (!isRequired(values.orgName)) {
      nextErrors.orgName = 'Organization name is required.'
    }
    if (!isRequired(values.pocName)) {
      nextErrors.pocName = 'Point of contact name is required.'
    }
    if (!isRequired(values.orgContact)) {
      nextErrors.orgContact = 'Contact phone number is required.'
    } else if (!isValidPhone(values.orgContact)) {
      nextErrors.orgContact = 'Enter a valid 10-digit phone number.'
    }
    if (!isRequired(values.orgEmail)) {
      nextErrors.orgEmail = 'Email is required.'
    } else if (!isValidEmail(values.orgEmail)) {
      nextErrors.orgEmail = 'Enter a valid email address.'
    }
    if (!isRequired(values.regNumber)) {
      nextErrors.regNumber = 'Registration number / HRF ID is required.'
    }
    if (!isRequired(values.orgAddress)) {
      nextErrors.orgAddress = 'Facility address is required.'
    }

    if (!isRequired(values.password)) {
      nextErrors.password = 'Password is required.'
    } else if (!isValidPassword(values.password)) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }
    if (!isRequired(values.confirmPassword)) {
      nextErrors.confirmPassword = 'Please confirm your password.'
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
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
      await registerOrganization({
        org_name: values.orgName,
        org_type: orgTypeToBackend[orgType],
        poc_name: values.pocName,
        poc_contact: values.orgContact,
        email: values.orgEmail,
        registration_number_hrf_id: values.regNumber,
        address: values.orgAddress,
        latitude: values.orgAddressLat,
        longitude: values.orgAddressLng,
        password: values.password,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.detail?.detail ?? err.message ?? 'Registration failed. Please try again.')
      } else {
        setSubmitError('Could not reach the server. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function inputCls(name) {
    return `${inputClass} ${errors[name] ? 'border-pink-dark' : 'border-line'}`
  }

  return (
    <AuthLayout
      title="Institutional Registration"
      subtitle="Join LifeLink Central Management Network as a verified healthcare organization."
      wide
      footer={
        <>
          Already registered? <Link to="/login">Login</Link>
        </>
      }
    >
      {/* Organization Type Selector */}
      <div className="flex gap-2 bg-pink-light rounded-full p-1 mb-6">
        {orgTypes.map((type) => {
          const Icon = type.icon
          const isSelected = orgType === type.value
          return (
            <button
              key={type.value}
              type="button"
              className={`flex-1 border-none px-3 py-2.5 rounded-full text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-pink text-white shadow-xs'
                  : 'bg-transparent text-pink-dark hover:bg-white/40'
              }`}
              onClick={() => setOrgType(type.value)}
            >
              <Icon className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          )
        })}
      </div>

      {success && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
          Registration submitted successfully! Your account will be reviewed by admin for approval. Redirecting to login…
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {submitError}
        </div>
      )}

      <form className="text-left flex flex-col gap-4 mt-2" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="orgName" className={labelClass}>
            {orgType === 'hospital' ? 'Hospital Name' : orgType === 'bloodbank' ? 'Blood Bank Name' : 'NGO Name'}
          </label>
          <input
            id="orgName"
            type="text"
            placeholder={
              orgType === 'hospital'
                ? 'City Multispeciality Hospital'
                : orgType === 'bloodbank'
                ? 'Central Regional Blood Bank'
                : 'Life Care Foundation'
            }
            value={values.orgName}
            onChange={(e) => handleChange('orgName', e.target.value)}
            className={inputCls('orgName')}
          />
          {errors.orgName && <span className={errorClass}>{errors.orgName}</span>}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="pocName" className={labelClass}>Point of Contact (POC) Name</label>
            <input
              id="pocName"
              type="text"
              placeholder="Dr. Amit Sharma"
              value={values.pocName}
              onChange={(e) => handleChange('pocName', e.target.value)}
              className={inputCls('pocName')}
            />
            {errors.pocName && <span className={errorClass}>{errors.pocName}</span>}
          </div>
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="orgContact" className={labelClass}>Contact Phone</label>
            <input
              id="orgContact"
              type="tel"
              placeholder="9876543210"
              value={values.orgContact}
              onChange={(e) => handleChange('orgContact', e.target.value)}
              className={inputCls('orgContact')}
            />
            {errors.orgContact && <span className={errorClass}>{errors.orgContact}</span>}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="orgEmail" className={labelClass}>Official Email</label>
            <input
              id="orgEmail"
              type="email"
              placeholder="contact@organization.org"
              value={values.orgEmail}
              onChange={(e) => handleChange('orgEmail', e.target.value)}
              className={inputCls('orgEmail')}
            />
            {errors.orgEmail && <span className={errorClass}>{errors.orgEmail}</span>}
          </div>
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="regNumber" className={labelClass}>Govt License / Registration No.</label>
            <input
              id="regNumber"
              type="text"
              placeholder="REG-2026-XXXX"
              value={values.regNumber}
              onChange={(e) => handleChange('regNumber', e.target.value)}
              className={inputCls('regNumber')}
            />
            {errors.regNumber && <span className={errorClass}>{errors.regNumber}</span>}
          </div>
        </div>

        <AddressField
          id="orgAddress"
          label="Facility Address &amp; Location"
          hint="Search facility address — this location coordinates blood transit and drives."
          value={values.orgAddress}
          latitude={values.orgAddressLat}
          longitude={values.orgAddressLng}
          error={errors.orgAddress}
          labelClass={labelClass}
          errorClass={errorClass}
          inputClassName={inputCls('orgAddress')}
          onChange={({ address, latitude, longitude }) =>
            setValues((v) => ({ ...v, orgAddress: address, orgAddressLat: latitude, orgAddressLng: longitude }))
          }
        />

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="orgDocs" className={labelClass}>Supporting Accreditation / Document (Optional)</label>
          <input
            id="orgDocs"
            type="file"
            onChange={(e) => setDocName(e.target.files[0]?.name ?? '')}
            className="text-xs text-muted"
          />
          {docName && <span className="text-muted text-xs">Selected: {docName}</span>}
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="password" className={labelClass}>Account Password</label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={values.password}
              onChange={(e) => handleChange('password', e.target.value)}
              className={inputCls('password')}
            />
            {errors.password && <span className={errorClass}>{errors.password}</span>}
          </div>
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              value={values.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              className={inputCls('confirmPassword')}
            />
            {errors.confirmPassword && <span className={errorClass}>{errors.confirmPassword}</span>}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-full text-sm font-bold bg-pink text-white hover:bg-pink-dark shadow-[0_4px_14px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px mt-2 disabled:opacity-50"
        >
          {submitting ? 'Registering Organization…' : `Register as ${orgTypes.find(t => t.value === orgType)?.label}`}
        </button>
      </form>
    </AuthLayout>
  )
}
