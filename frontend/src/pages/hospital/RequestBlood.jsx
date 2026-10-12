import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Droplet, AlertTriangle, Building2, Send, CheckCircle2, ArrowLeft } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, ApiError } from '../../api/index.js'
import { labelClass, inputClass, selectClass } from '../../constants/formStyles.js'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const PRIORITIES = [
  { value: 'EMERGENCY', label: 'EMERGENCY (Immediate need, life-critical)' },
  { value: 'URGENT', label: 'URGENT (Required within 4-6 hours)' },
  { value: 'PLANNED', label: 'ROUTINE / PLANNED (Scheduled surgeries & general stock)' },
]

export default function HospitalRequestBlood() {
  const navigate = useNavigate()
  const [connectedBanks, setConnectedBanks] = useState([])
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    blood_bank_id: '',
    blood_group_required: 'O+',
    units_required: 5,
    priority: 'EMERGENCY',
    emergency_reason: '',
  })

  useEffect(() => {
    hospitalApi
      .getLinkedBloodBanks()
      .then((banks) => {
        const list = Array.isArray(banks) ? banks : []
        setConnectedBanks(list)
        if (list.length > 0) {
          setForm((f) => ({ ...f, blood_bank_id: String(list[0].id) }))
        }
      })
      .catch(() => setError('Could not load connected blood banks.'))
      .finally(() => setLoadingBanks(false))
  }, [])

  function handleChange(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.blood_bank_id) {
      setError('Please select a connected blood bank to send this requisition to.')
      return
    }
    if (form.units_required < 1) {
      setError('Units required must be at least 1.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await hospitalApi.createBloodRequest({
        patient_name: form.emergency_reason.trim() ? `Requisition (${form.emergency_reason.trim()})` : 'Hospital Requisition',
        blood_bank_id: parseInt(form.blood_bank_id, 10),
        blood_group_required: form.blood_group_required,
        units_required: parseInt(form.units_required, 10),
        priority: form.priority,
        emergency_reason: form.emergency_reason.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/hospital/requests/pending')
      }, 1500)
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail?.detail ?? err.message : 'Failed to submit blood requisition.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout active="Raise Blood Request" links={hospitalSidebarLinks}>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Hospital Blood Requisition
          </h1>
          <p className="text-muted text-sm">
            Direct institutional requisition to a connected blood bank. No patient verification required.
          </p>
        </div>
        <Link
          to="/hospital/requests/pending"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View All Requisitions</span>
        </Link>
      </div>

      {success && (
        <div className="bg-[#e3f5e8] border border-green-200 text-[#1f8a3d] text-sm font-bold rounded-2xl p-5 mb-6 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Requisition submitted successfully! Dispatched directly to blood bank for inventory allocation.</span>
        </div>
      )}

      {error && (
        <div className="bg-[#ffe1e1] border border-red-200 text-[#d5233f] text-sm font-semibold rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loadingBanks ? (
        <p className="text-muted py-8">Loading connected blood banks…</p>
      ) : connectedBanks.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 max-w-xl text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink mb-1">No Connected Blood Banks</h3>
          <p className="text-muted text-xs sm:text-sm mb-6 max-w-md mx-auto">
            Your hospital needs at least one connected blood bank to send requisitions. Connect to blood banks in your network first.
          </p>
          <Link
            to="/hospital/blood-bank"
            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-bold bg-pink text-white hover:bg-pink-dark transition-all"
          >
            Connect to Blood Banks
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-xl shadow-xs space-y-5">
          {/* Target Blood Bank Selection */}
          <div>
            <label className={labelClass}>Target Blood Bank *</label>
            <p className="text-muted text-[11px] mb-1.5">
              Select which of your connected blood banks will receive and fulfill this requisition.
            </p>
            <select
              value={form.blood_bank_id}
              onChange={(e) => handleChange('blood_bank_id', e.target.value)}
              className={selectClass}
              required
            >
              {connectedBanks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.org_name} {bank.address ? `(${bank.address})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Blood Group & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Blood Group Needed *</label>
              <select
                value={form.blood_group_required}
                onChange={(e) => handleChange('blood_group_required', e.target.value)}
                className={selectClass}
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Units Required *</label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.units_required}
                onChange={(e) => handleChange('units_required', e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className={labelClass}>Requisition Priority *</label>
            <div className="space-y-2 mt-1">
              {PRIORITIES.map((p) => {
                const isSelected = form.priority === p.value
                return (
                  <label
                    key={p.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-pink bg-pink/5 font-bold text-ink'
                        : 'border-line hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={p.value}
                      checked={isSelected}
                      onChange={() => handleChange('priority', p.value)}
                      className="accent-pink"
                    />
                    <span>{p.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Department / Requisition Note (Optional) */}
          <div>
            <label className={labelClass}>Department / Requisition Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Trauma Emergency, OT Room 2, General Surgical Stock"
              value={form.emergency_reason}
              onChange={(e) => handleChange('emergency_reason', e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full text-sm font-bold bg-pink text-white hover:bg-pink-dark shadow-[0_4px_14px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {submitting ? (
              'Submitting Requisition…'
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Blood Requisition to Bank</span>
              </>
            )}
          </button>
        </form>
      )}
    </DashboardLayout>
  )
}
