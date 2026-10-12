import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import { isRequired } from '../../utils/validators.js'
import { labelClass, errorClass, inputCls } from '../../constants/formStyles.js'
import { ngoApi, ApiError } from '../../api/index.js'
import MapPicker from '../../components/MapPicker.jsx'
import PlaceSearchInput from '../../components/PlaceSearchInput.jsx'

const btnSubmit =
  'inline-flex items-center justify-center rounded-full text-[15px] font-semibold bg-pink text-white shadow-[0_8px_20px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark w-full mt-1 p-[13px]'

const initialValues = {
  name: '',
  description: '',
  date: '',
  time: '',
  venue: '',
  contactPerson: '',
  contactNumber: '',
  latitude: null,
  longitude: null,
}

export default function PublishDrive() {
  const navigate = useNavigate()
  const location = useLocation()
  const shortageAlert = location.state?.shortageAlert

  const [values, setValues] = useState(() => ({
    ...initialValues,
    name: shortageAlert
      ? `Emergency ${shortageAlert.blood_group} Blood Drive`
      : '',
    description: shortageAlert
      ? `Drive organized in response to shortage alert from ${shortageAlert.blood_bank?.org_name || 'Blood Bank'}. ${shortageAlert.message}`
      : '',
    venue: shortageAlert?.blood_bank?.address || '',
  }))
  const [errors, setErrors] = useState({})
  const [published, setPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Bumped whenever the pin moves from somewhere other than the map itself, so
  // the map flies to the new spot instead of leaving it off-screen.
  const [flyToToken, setFlyToToken] = useState(0)

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const nextErrors = {}
    if (!isRequired(values.name)) nextErrors.name = 'Drive name is required.'
    if (!isRequired(values.date)) nextErrors.date = 'Date is required.'
    if (!isRequired(values.venue)) nextErrors.venue = 'Venue is required.'
    if (!isRequired(values.contactPerson)) nextErrors.contactPerson = 'Contact person is required.'
    return nextErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    const dateTime = values.time ? `${values.date}T${values.time}` : `${values.date}T00:00`
    const contactInfo = [values.contactPerson, values.contactNumber].filter(Boolean).join(', ')

    setSubmitting(true)
    try {
      await ngoApi.createCamp(
        {
          title: values.name,
          venue: values.venue,
          date_time: new Date(dateTime).toISOString(),
          contact_info: contactInfo,
          latitude: values.latitude,
          longitude: values.longitude,
        },
        shortageAlert ? shortageAlert.id : undefined
      )
      setPublished(true)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not publish the drive.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout active="Donation Drives" links={ngoSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Publish a Drive</h1>
      <p className="text-muted mb-6">Create a new blood donation camp and schedule it for donors and volunteers.</p>

      {shortageAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 max-w-[560px]">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              Responding to Shortage Alert #{shortageAlert.id}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Target Blood Bank: <strong>{shortageAlert.blood_bank?.org_name ?? 'Partner Bank'}</strong> · Group:{' '}
              <strong className="font-extrabold text-pink-dark">{shortageAlert.blood_group}</strong> ({shortageAlert.units_needed} units).
              Publishing will update this alert to "Drive Scheduled" and notify the blood bank.
            </p>
          </div>
        </div>
      )}

      {published ? (
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[560px] shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-[#1f8a3d]">
            <CheckCircle2 className="w-6 h-6" />
            <p className="text-lg font-bold">Drive published</p>
          </div>
          <p className="text-muted text-xs sm:text-sm mb-6">
            {values.name} has been published and is now visible to donors.
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full px-7 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:-translate-y-px hover:bg-pink-dark"
            onClick={() => navigate('/ngo/drives')}
          >
            Back to Drives
          </button>
        </div>
      ) : (
        <form
          className="bg-white border border-line rounded-[14px] p-8 max-w-[560px] flex flex-col gap-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="name" className={labelClass}>Drive Name</label>
            <input
              id="name"
              type="text"
              placeholder="City Hospital Blood Camp"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputCls(errors, 'name')}
            />
            {errors.name && <span className={errorClass}>{errors.name}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="description" className={labelClass}>Description</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Details about the drive"
              value={values.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={`${inputCls(errors, 'description')} resize-none`}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="date" className={labelClass}>Date</label>
              <input
                id="date"
                type="date"
                value={values.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={inputCls(errors, 'date')}
              />
              {errors.date && <span className={errorClass}>{errors.date}</span>}
            </div>
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="time" className={labelClass}>Time</label>
              <input
                id="time"
                type="time"
                value={values.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className={inputCls(errors, 'time')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="venue" className={labelClass}>Venue / Address</label>
            <p className="text-muted text-xs">
              Start typing and pick a suggestion — we'll drop the map pin for you.
            </p>
            <PlaceSearchInput
              id="venue"
              placeholder="RIMS, Ranchi"
              value={values.venue}
              onChange={(next) => handleChange('venue', next)}
              onSelect={(place) => {
                setValues((v) => ({ ...v, latitude: place.latitude, longitude: place.longitude }))
                setFlyToToken((t) => t + 1)
              }}
              className={inputCls(errors, 'venue')}
            />
            {errors.venue && <span className={errorClass}>{errors.venue}</span>}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className={labelClass}>
              {values.latitude != null ? 'Map Pin' : 'Map Pin (optional)'}
            </label>
            <p className="text-muted text-xs">
              Donors get a map and a one-tap directions link for pinned drives.
            </p>
            <MapPicker
              latitude={values.latitude}
              longitude={values.longitude}
              flyToToken={flyToToken}
              onChange={(lat, lng) => setValues((v) => ({ ...v, latitude: lat, longitude: lng }))}
              onAddressResolved={(address) => handleChange('venue', address)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="contactPerson" className={labelClass}>Contact Person</label>
              <input
                id="contactPerson"
                type="text"
                placeholder="Dr. Amit Kumar"
                value={values.contactPerson}
                onChange={(e) => handleChange('contactPerson', e.target.value)}
                className={inputCls(errors, 'contactPerson')}
              />
              {errors.contactPerson && <span className={errorClass}>{errors.contactPerson}</span>}
            </div>
            <div className="flex flex-col gap-[6px] flex-1">
              <label htmlFor="contactNumber" className={labelClass}>Contact Number</label>
              <input
                id="contactNumber"
                type="tel"
                placeholder="9000000000"
                value={values.contactNumber}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                className={inputCls(errors, 'contactNumber')}
              />
            </div>
          </div>

          {submitError && <p className={errorClass}>{submitError}</p>}
          <button type="submit" disabled={submitting} className={btnSubmit}>
            {submitting ? 'Publishing…' : 'Publish Drive'}
          </button>
        </form>
      )}
    </DashboardLayout>
  )
}
