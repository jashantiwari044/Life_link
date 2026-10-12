import { useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Save,
  Plus,
  Minus,
  X,
  BellRing,
  Send,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ALERT_BLOOD_GROUPS = ['ALL', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function getStockStatus(units) {
  if (units === 0) return { label: 'Out of Stock', badge: 'bg-[#ffe1e1] text-[#d5233f] border-[#fca5a5]', bar: 'bg-[#d5233f]' }
  if (units < 5) return { label: 'Critical Low', badge: 'bg-[#ffe1e1] text-[#d5233f] border-[#fca5a5]', bar: 'bg-[#d5233f]' }
  if (units < 15) return { label: 'Moderate', badge: 'bg-[#fff1d6] text-[#b9770e] border-[#fde68a]', bar: 'bg-[#b9770e]' }
  return { label: 'Optimal', badge: 'bg-[#e3f5e8] text-[#1f8a3d] border-[#86efac]', bar: 'bg-[#1f8a3d]' }
}

const urgencyBadge = {
  CRITICAL: 'bg-[#ffe1e1] text-[#d5233f] border-red-200',
  HIGH: 'bg-[#fff1d6] text-[#b9770e] border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
}

const statusBadge = {
  OPEN: 'bg-amber-50 text-amber-700 border-amber-200',
  DRIVE_SCHEDULED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RESOLVED: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function Inventory() {
  const [initialData, setInitialData] = useState({})
  const [editedValues, setEditedValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [savingSingleGroup, setSavingSingleGroup] = useState(null)
  const [filter, setFilter] = useState('ALL')

  // Shortage alerts
  const [shortageAlerts, setShortageAlerts] = useState([])
  const [alertModalOpen, setAlertModalOpen] = useState(false)
  const [alertForm, setAlertForm] = useState({
    blood_group: 'O+',
    units_needed: 10,
    urgency: 'HIGH',
    message: '',
  })
  const [alertSubmitting, setAlertSubmitting] = useState(false)
  const [alertError, setAlertError] = useState('')
  const [alertSuccess, setAlertSuccess] = useState('')

  async function loadInventory() {
    const data = await bloodBankApi.getInventory()
    const map = {}
    BLOOD_GROUPS.forEach((bg) => {
      const match = data.find((d) => d.blood_group === bg)
      map[bg] = match ? match.units_available : 0
    })
    setInitialData(map)
    setEditedValues(map)
  }

  async function loadShortageAlerts() {
    try {
      const data = await bloodBankApi.listShortageAlerts()
      setShortageAlerts(Array.isArray(data) ? data : [])
    } catch {
      // Non-blocking
    }
  }

  useEffect(() => {
    Promise.all([loadInventory(), loadShortageAlerts()])
      .catch((err) => setLoadError(describeError(err, 'Could not load inventory or alerts.')))
      .finally(() => setLoading(false))
  }, [])

  // Identify which blood groups have unsaved changes
  const modifiedGroups = useMemo(() => {
    return BLOOD_GROUPS.filter((bg) => editedValues[bg] !== initialData[bg])
  }, [editedValues, initialData])

  const hasUnsavedChanges = modifiedGroups.length > 0

  // Calculate high-level summary KPIs
  const kpis = useMemo(() => {
    let total = 0
    let lowCount = 0
    let optimalCount = 0
    BLOOD_GROUPS.forEach((bg) => {
      const val = editedValues[bg] ?? 0
      total += val
      if (val < 5) lowCount++
      else if (val >= 15) optimalCount++
    })
    return { total, lowCount, optimalCount }
  }, [editedValues])

  function handleUnitChange(bg, deltaOrValue, isDelta = false) {
    setSaveSuccess('')
    setEditedValues((prev) => {
      const current = prev[bg] ?? 0
      let next
      if (isDelta) {
        next = Math.max(0, current + deltaOrValue)
      } else {
        const parsed = parseInt(deltaOrValue, 10)
        next = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
      }
      return { ...prev, [bg]: next }
    })
  }

  function handleResetAll() {
    setEditedValues(initialData)
    setSaveSuccess('')
  }

  async function handleSaveGlobal() {
    if (!hasUnsavedChanges) return
    setSavingGlobal(true)
    setSaveSuccess('')
    try {
      const itemsToUpdate = BLOOD_GROUPS.map((bg) => ({
        blood_group: bg,
        units_available: editedValues[bg] ?? 0,
      }))
      await bloodBankApi.setInventoryBatch(itemsToUpdate)
      setInitialData({ ...editedValues })
      setSaveSuccess('All blood inventory units updated successfully!')
      setTimeout(() => setSaveSuccess(''), 4000)
    } catch (err) {
      setLoadError(describeError(err, 'Failed to save inventory.'))
    } finally {
      setSavingGlobal(false)
    }
  }

  async function handleSaveSingle(bg) {
    const units = editedValues[bg] ?? 0
    setSavingSingleGroup(bg)
    setSaveSuccess('')
    try {
      await bloodBankApi.setInventory(bg, units)
      setInitialData((prev) => ({ ...prev, [bg]: units }))
      setSaveSuccess(`Updated ${bg} to ${units} unit(s).`)
      setTimeout(() => setSaveSuccess(''), 3000)
    } catch (err) {
      setLoadError(describeError(err, `Failed to update ${bg}.`))
    } finally {
      setSavingSingleGroup(null)
    }
  }

  async function handleSendAlert(e) {
    e.preventDefault()
    if (!alertForm.message.trim()) {
      setAlertError('Please provide a message describing the shortage to NGOs.')
      return
    }
    if (alertForm.units_needed < 1) {
      setAlertError('Units needed must be at least 1.')
      return
    }

    setAlertSubmitting(true)
    setAlertError('')
    try {
      await bloodBankApi.createShortageAlert({
        blood_group: alertForm.blood_group,
        units_needed: parseInt(alertForm.units_needed, 10),
        urgency: alertForm.urgency,
        message: alertForm.message.trim(),
      })
      setAlertSuccess('Shortage alert broadcasted! All registered NGOs have been notified.')
      setAlertModalOpen(false)
      await loadShortageAlerts()
      setTimeout(() => setAlertSuccess(''), 5000)
    } catch (err) {
      setAlertError(describeError(err, 'Failed to broadcast shortage alert.'))
    } finally {
      setAlertSubmitting(false)
    }
  }

  const filteredGroups = useMemo(() => {
    if (filter === 'CRITICAL') return BLOOD_GROUPS.filter((bg) => (editedValues[bg] ?? 0) < 5)
    if (filter === 'OPTIMAL') return BLOOD_GROUPS.filter((bg) => (editedValues[bg] ?? 0) >= 15)
    return BLOOD_GROUPS
  }, [filter, editedValues])

  return (
    <DashboardLayout active="Inventory & Shortages" links={bloodBankSidebarLinks}>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold mb-[6px]">Blood Bank Inventory &amp; Shortages</h1>
          <p className="text-muted text-sm">
            Manage real-time blood stock and broadcast shortage alerts to partnering NGOs for donation drives.
          </p>
        </div>

        {/* Action Buttons at Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setAlertForm({
                blood_group: 'O+',
                units_needed: 10,
                urgency: 'HIGH',
                message: 'Urgent blood shortage reported. Partnering NGOs are requested to organize a blood donation drive.',
              })
              setAlertError('')
              setAlertModalOpen(true)
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-[10px] text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.25)] transition-transform duration-150 hover:-translate-y-px"
          >
            <BellRing className="w-4 h-4" />
            <span>Notify NGOs of Shortage</span>
          </button>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={savingGlobal}
              className="inline-flex items-center justify-center rounded-full px-5 py-[10px] text-sm font-semibold bg-white text-ink border border-line transition-transform duration-150 hover:-translate-y-px"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveGlobal}
            disabled={!hasUnsavedChanges || savingGlobal}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-[10px] text-sm font-bold shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all duration-150 ${
              hasUnsavedChanges
                ? 'bg-pink text-white hover:bg-pink-dark hover:-translate-y-px'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {savingGlobal ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving All…
              </>
            ) : hasUnsavedChanges ? (
              `Save All Changes (${modifiedGroups.length})`
            ) : (
              'All Stock Saved'
            )}
          </button>
        </div>
      </div>

      <LoadError message={loadError} />

      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-[#e3f5e8] border border-[#86efac] flex items-center gap-3 text-[#1f8a3d] font-semibold text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {alertSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800 font-semibold text-sm">
          <BellRing className="w-5 h-5 shrink-0 text-amber-600" />
          <span>{alertSuccess}</span>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-muted mb-1">Total Blood Units in Stock</p>
          <p className="text-3xl font-extrabold text-ink">{kpis.total}</p>
          <p className="text-xs text-muted mt-1">Sum across all 8 blood groups</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-muted mb-1">Critical Low / Empty</p>
          <p className={`text-3xl font-extrabold ${kpis.lowCount > 0 ? 'text-[#d5233f]' : 'text-ink'}`}>
            {kpis.lowCount}
          </p>
          <p className="text-xs text-muted mt-1">&lt; 5 units available (action needed)</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-semibold text-muted mb-1">Optimal Reserves</p>
          <p className="text-3xl font-extrabold text-[#1f8a3d]">{kpis.optimalCount}</p>
          <p className="text-xs text-muted mt-1">15+ units available</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['ALL', 'CRITICAL', 'OPTIMAL'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === f ? 'bg-pink text-white shadow-xs' : 'bg-white text-ink border border-line hover:border-pink'
            }`}
          >
            {f === 'ALL' ? `All Groups (${BLOOD_GROUPS.length})` : f === 'CRITICAL' ? `Critical Low (${kpis.lowCount})` : `Optimal (${kpis.optimalCount})`}
          </button>
        ))}
      </div>

      {/* Inventory Grid */}
      {loading ? (
        <p className="text-muted py-8">Loading inventory…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {filteredGroups.map((bg) => {
            const val = editedValues[bg] ?? 0
            const initialVal = initialData[bg] ?? 0
            const isModified = val !== initialVal
            const status = getStockStatus(val)
            const isSavingThis = savingSingleGroup === bg

            return (
              <div
                key={bg}
                className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between ${
                  isModified ? 'border-pink ring-2 ring-pink/20' : 'border-line hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl font-black text-ink">{bg}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${status.badge}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full transition-all duration-300 ${status.bar}`}
                      style={{ width: `${Math.min(100, (val / 20) * 100)}%` }}
                    />
                  </div>

                  {/* Units Count & Manual Input */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-muted font-medium">Available Units:</span>
                    <input
                      type="number"
                      min="0"
                      value={val}
                      onChange={(e) => handleUnitChange(bg, e.target.value, false)}
                      className="w-20 px-2 py-1 text-right font-extrabold text-lg text-ink border border-line rounded-lg focus:outline-none focus:border-pink focus:ring-1 focus:ring-pink"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Quick +/- buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, -1, true)}
                      className="flex-1 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, 1, true)}
                      className="flex-1 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, 5, true)}
                      className="flex-1 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      +5
                    </button>
                  </div>

                  {/* Quick Save if modified */}
                  {isModified && (
                    <button
                      type="button"
                      disabled={isSavingThis}
                      onClick={() => handleSaveSingle(bg)}
                      className="w-full py-1.5 rounded-lg text-xs font-bold bg-pink-light text-pink-dark hover:bg-pink hover:text-white transition-colors"
                    >
                      {isSavingThis ? 'Saving…' : 'Quick Save'}
                    </button>
                  )}

                  {/* Alert NGOs button if low stock */}
                  {val < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAlertForm({
                          blood_group: bg,
                          units_needed: Math.max(5, 10 - val),
                          urgency: val === 0 ? 'CRITICAL' : 'HIGH',
                          message: `Critical stock shortage for ${bg} (${val} units in blood bank). Requesting urgent donation drive support.`,
                        })
                        setAlertError('')
                        setAlertModalOpen(true)
                      }}
                      className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Alert NGOs for {bg}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Broadcasted Shortage Alerts to NGOs Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Broadcasted Shortage Alerts to NGOs</span>
            </h2>
            <p className="text-muted text-xs">
              Alerts sent to partnering NGOs to mobilize emergency blood donation drives.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAlertForm({
                blood_group: 'ALL',
                units_needed: 15,
                urgency: 'HIGH',
                message: 'General blood shortage across multiple blood groups. We request partnering NGOs to organize a donation drive.',
              })
              setAlertError('')
              setAlertModalOpen(true)
            }}
            className="text-amber-600 hover:text-amber-700 text-xs font-bold inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Shortage Alert</span>
          </button>
        </div>

        {shortageAlerts.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No active shortage alerts currently broadcasted. When inventory drops low, click "Notify NGOs of Shortage" to mobilize donation drives.
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-slate-50 text-muted text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3">Blood Group</th>
                    <th className="text-left px-5 py-3">Units Needed</th>
                    <th className="text-left px-5 py-3">Urgency</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3">Message</th>
                    <th className="text-left px-5 py-3">Broadcasted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shortageAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-pink-dark">
                        {alert.blood_group}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-ink">
                        {alert.units_needed} unit(s)
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgencyBadge[alert.urgency] ?? 'bg-slate-100 text-slate-700'}`}>
                          {alert.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[alert.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {alert.status === 'DRIVE_SCHEDULED' ? 'Drive Scheduled 🎉' : alert.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted max-w-xs truncate" title={alert.message}>
                        {alert.message}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                        {formatDate(alert.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Floating Bottom Bar if Unsaved Changes Exist */}
      {hasUnsavedChanges && (
        <div className="sticky bottom-6 z-30 bg-ink text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between flex-wrap gap-4 border border-slate-700 animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <div>
              <p className="font-bold text-sm">
                {modifiedGroups.length} blood group{modifiedGroups.length > 1 ? 's' : ''} have unsaved changes
              </p>
              <p className="text-xs text-slate-400">
                Click "Save All Changes" to synchronize stock across the platform.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetAll}
              disabled={savingGlobal}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSaveGlobal}
              disabled={savingGlobal}
              className="px-6 py-2.5 rounded-full text-sm font-bold bg-pink text-white hover:bg-pink-dark transition-transform duration-150 hover:-translate-y-px shadow-[0_4px_14px_rgba(242,70,125,0.4)] disabled:opacity-50"
            >
              {savingGlobal ? 'Saving All Stock…' : 'Save All Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Shortage Alert Modal */}
      {alertModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-line relative animate-scale-up">
            <button
              type="button"
              onClick={() => setAlertModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Notify NGOs of Shortage</h3>
                <p className="text-xs text-muted">Broadcast to all active NGOs to organize donation drives.</p>
              </div>
            </div>

            {alertError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                {alertError}
              </div>
            )}

            <form onSubmit={handleSendAlert} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Blood Group in Shortage
                </label>
                <select
                  value={alertForm.blood_group}
                  onChange={(e) => setAlertForm({ ...alertForm, blood_group: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm font-semibold focus:outline-none focus:border-pink"
                >
                  {ALERT_BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg === 'ALL' ? 'ALL Groups (General Shortage)' : `${bg} Blood`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Units Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={alertForm.units_needed}
                    onChange={(e) => setAlertForm({ ...alertForm, units_needed: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm font-semibold focus:outline-none focus:border-pink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={alertForm.urgency}
                    onChange={(e) => setAlertForm({ ...alertForm, urgency: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm font-semibold focus:outline-none focus:border-pink"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Message / Drive Request Note
                </label>
                <textarea
                  rows="3"
                  value={alertForm.message}
                  onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                  placeholder="e.g. Critical depletion of O+ blood due to multiple surgeries. Urgent camp needed."
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-pink"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAlertModalOpen(false)}
                  disabled={alertSubmitting}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={alertSubmitting}
                  className="flex-1 py-2.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {alertSubmitting ? (
                    'Broadcasting…'
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Broadcast to NGOs</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
