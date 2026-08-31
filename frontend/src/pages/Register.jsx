import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import AddressField from '../components/AddressField.jsx'
import {
  isRequired,
  isValidEmail,
  isValidPhone,
  isValidAadhaar,
  isValidPassword,
  isValidDob,
} from '../utils/validators.js'
import { useAuth, dashboardPathForRole } from '../context/AuthContext.jsx'
import { ApiError } from '../api/index.js'

const orgTypes = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'bloodbank', label: 'Blood Bank' },
  { value: 'ngo', label: 'NGO' },
]

const orgTypeToBackend = {
  hospital: 'HOSPITAL',
  bloodbank: 'BLOOD_BANK',
  ngo: 'NGO',
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const inputClass =
  'border rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink'
const labelClass = 'text-[13px] font-semibold text-ink'
const errorClass = 'text-pink-dark text-xs font-semibold'

const initialValues = {
  fullName: '',
  dob: '',
  bloodGroup: '',
  aadhaar: '',
  phone: '',
  email: '',
  address: '',
  addressLat: null,
  addressLng: null,
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
  const { register, registerOrganization } = useAuth()
  const [searchParams] = useSearchParams()
  const initialRole = searchParams.get('role')
  const [accountType, setAccountType] = useState(
    initialRole ? 'organization' : 'normal',
  )
  const [orgType, setOrgType] = useState(
    orgTypes.some((t) => t.value === initialRole) ? initialRole : 'hospital',
  )
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [docName, setDocName] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const nextErrors = {}

    if (accountType === 'normal') {
      if (!isRequired(values.fullName)) nextErrors.fullName = 'Full name is required.'
      if (!isRequired(values.dob)) {
        nextErrors.dob = 'Date of birth is required.'
      } else if (!isValidDob(values.dob)) {
        nextErrors.dob = 'Date of birth cannot be in the future.'
      }
      if (!isRequired(values.bloodGroup)) nextErrors.bloodGroup = 'Select a blood group.'
      if (!isRequired(values.aadhaar)) {
        nextErrors.aadhaar = 'Aadhaar number is required.'
      } else if (!isValidAadhaar(values.aadhaar)) {
        nextErrors.aadhaar = 'Aadhaar number must be exactly 12 digits.'
      }
      if (!isRequired(values.phone)) {
        nextErrors.phone = 'Phone number is required.'
      } else if (!isValidPhone(values.phone)) {
        nextErrors.phone = 'Enter a valid 10-digit phone number.'
      }
      if (!isRequired(values.email)) {
        nextErrors.email = 'Email is required.'
      } else if (!isValidEmail(values.email)) {
        nextErrors.email = 'Enter a valid email address.'
      }
      if (!isRequired(values.address)) nextErrors.address = 'Address is required.'
    } else {
      if (!isRequired(values.orgName)) nextErrors.orgName = 'Organization name is required.'
      if (!isRequired(values.pocName)) {
        nextErrors.pocName = 'Point of contact name is required.'
      }
      if (!isRequired(values.orgContact)) {
        nextErrors.orgContact = 'Contact number is required.'
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
        nextErrors.orgAddress = 'Address is required.'
      }
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
      if (accountType === 'organization') {
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
        navigate('/login')
      } else {
        const role = await register({
          full_name: values.fullName,
          dob: values.dob,
          blood_group: values.bloodGroup,
          phone_number: values.phone,
          email: values.email,
          address: values.address,
          // Pinning the home address also seeds the coordinates used to surface
          // nearby SOS requests, so donors get matched without extra setup.
          current_lat: values.addressLat,
          current_lng: values.addressLng,
          aadhaar_number_redacted: values.aadhaar,
          password: values.password,
        })
        navigate(dashboardPathForRole[role] ?? '/dashboard')
      }
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
      title="Create Account"
      subtitle="Join LifeLink to donate, request, or coordinate blood donations."
      wide
      footer={
        <>
          Already have an account? <Link to="/login">Login</Link>
        </>
      }
    >
      <div className="flex gap-2 bg-pink-light rounded-full p-1 mb-6">
        <button
          type="button"
          className={`flex-1 border-none px-[6px] py-[9px] rounded-full text-[13px] font-semibold ${accountType === 'normal' ? 'bg-pink text-white' : 'bg-transparent text-pink-dark'}`}
          onClick={() => setAccountType('normal')}
        >
          Normal User
        </button>
        <button
          type="button"
          className={`flex-1 border-none px-[6px] py-[9px] rounded-full text-[13px] font-semibold ${accountType === 'organization' ? 'bg-pink text-white' : 'bg-transparent text-pink-dark'}`}
          onClick={() => setAccountType('organization')}
        >
          Organization
        </button>
      </div>

      <form className="text-left flex flex-col gap-4 mt-2" onSubmit={handleSubmit} noValidate>
        {accountType === 'normal' ? (
          <>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="fullName" className={labelClass}>Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="Jane Doe"
                value={values.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className={inputCls('fullName')}
              />
              {errors.fullName && <span className={errorClass}>{errors.fullName}</span>}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-[6px] flex-1">
                <label htmlFor="dob" className={labelClass}>Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={values.dob}
                  onChange={(e) => handleChange('dob', e.target.value)}
                  className={inputCls('dob')}
                />
                {errors.dob && <span className={errorClass}>{errors.dob}</span>}
              </div>
              <div className="flex flex-col gap-[6px] flex-1">
                <label htmlFor="bloodGroup" className={labelClass}>Blood Group</label>
                <select
                  id="bloodGroup"
                  value={values.bloodGroup}
                  onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  className={inputCls('bloodGroup')}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
                {errors.bloodGroup && <span className={errorClass}>{errors.bloodGroup}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="aadhaar" className={labelClass}>Aadhaar Number</label>
              <input
                id="aadhaar"
                type="text"
                placeholder="XXXX XXXX XXXX"
                value={values.aadhaar}
                onChange={(e) => handleChange('aadhaar', e.target.value)}
                className={inputCls('aadhaar')}
              />
              {errors.aadhaar && <span className={errorClass}>{errors.aadhaar}</span>}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-[6px] flex-1">
                <label htmlFor="phone" className={labelClass}>Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="9000000000"
                  value={values.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={inputCls('phone')}
                />
                {errors.phone && <span className={errorClass}>{errors.phone}</span>}
              </div>
              <div className="flex flex-col gap-[6px] flex-1">
                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={inputCls('email')}
                />
                {errors.email && <span className={errorClass}>{errors.email}</span>}
              </div>
            </div>
            <AddressField
              id="address"
              label="Address"
              value={values.address}
              latitude={values.addressLat}
              longitude={values.addressLng}
              error={errors.address}
              labelClass={labelClass}
              errorClass={errorClass}
              inputClassName={inputCls('address')}
              onChange={({ address, latitude, longitude }) =>
                setValues((v) => ({ ...v, address, addressLat: latitude, addressLng: longitude }))
              }
            />
          </>
        ) : (
          <>
            <div className="flex gap-[10px]">
              {orgTypes.map((type) => (
                <label
                  key={type.value}
                  className="flex-1 border border-line rounded-[10px] p-[10px] text-center text-[13px] font-semibold flex items-center justify-center gap-[6px] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="orgType"
                    value={type.value}
                    checked={orgType === type.value}
                    onChange={() => setOrgType(type.value)}
                  />
                  {type.label}
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="orgName" className={labelClass}>Organization Name</label>
              <input
                id="orgName"
                type="text"
                placeholder="Ranchi Central Blood Bank"
                value={values.orgName}
                onChange={(e) => handleChange('orgName', e.target.value)}
                className={inputCls('orgName')}
              />
              {errors.orgName && <span className={errorClass}>{errors.orgName}</span>}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-[6px] flex-1">
                <label htmlFor="pocName" className={labelClass}>Point of Contact Name</label>
                <input
                  id="pocName"
                  type="text"
                  placeholder="Dr. Amit Kumar"
                  value={values.pocName}
                  onChange={(e) => handleChange('pocName', e.target.value)}
                  className={inputCls('pocName')}
                />
                {errors.pocName && <span className={errorClass}>{errors.pocName}</span>}
              </div>
              <div className="flex flex-col gap-[6px] flex-1">
                <label htmlFor="orgContact" className={labelClass}>Contact Number</label>
                <input
                  id="orgContact"
                  type="tel"
                  placeholder="9000000000"
                  value={values.orgContact}
                  onChange={(e) => handleChange('orgContact', e.target.value)}
                  className={inputCls('orgContact')}
                />
                {errors.orgContact && <span className={errorClass}>{errors.orgContact}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="orgEmail" className={labelClass}>Email</label>
              <input
                id="orgEmail"
                type="email"
                placeholder="contact@org.com"
                value={values.orgEmail}
                onChange={(e) => handleChange('orgEmail', e.target.value)}
                className={inputCls('orgEmail')}
              />
              {errors.orgEmail && <span className={errorClass}>{errors.orgEmail}</span>}
            </div>
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="regNumber" className={labelClass}>Registration Number / HRF ID</label>
              <input
                id="regNumber"
                type="text"
                placeholder="e.g. HRF-2026-0042"
                value={values.regNumber}
                onChange={(e) => handleChange('regNumber', e.target.value)}
                className={inputCls('regNumber')}
              />
              {errors.regNumber && <span className={errorClass}>{errors.regNumber}</span>}
            </div>
            <AddressField
              id="orgAddress"
              label="Address"
              hint="Search your facility — donors and partners get a map and directions to this pin."
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
              <label htmlFor="orgDocs" className={labelClass}>Supporting Documents</label>
              <input
                id="orgDocs"
                type="file"
                onChange={(e) => setDocName(e.target.files[0]?.name ?? '')}
              />
              {docName && <span className="text-muted text-xs">Selected: {docName}</span>}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <div className="flex flex-col gap-[6px] flex-1">
            <label htmlFor="password" className={labelClass}>Password</label>
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
            {errors.confirmPassword && (
              <span className={errorClass}>{errors.confirmPassword}</span>
            )}
          </div>
        </div>

        {accountType === 'organization' && (
          <p className="text-muted text-xs">
            Organization accounts require admin approval before you can log in.
          </p>
        )}
        {submitError && (
          <div className="text-pink-dark text-[13px] font-semibold text-center">{submitError}</div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full text-[15px] font-semibold bg-pink text-white shadow-[0_8px_20px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark w-full mt-1 p-[13px] disabled:opacity-60"
        >
          {submitting ? 'Creating Account…' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  )
}
