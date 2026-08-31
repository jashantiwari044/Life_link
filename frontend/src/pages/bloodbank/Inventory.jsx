import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw, Save, Plus, Minus, X } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function getStockStatus(units) {
  if (units === 0) return { label: 'Out of Stock', badge: 'bg-[#ffe1e1] text-[#d5233f] border-[#fca5a5]', bar: 'bg-[#d5233f]' }
  if (units < 5) return { label: 'Critical Low', badge: 'bg-[#ffe1e1] text-[#d5233f] border-[#fca5a5]', bar: 'bg-[#d5233f]' }
  if (units < 15) return { label: 'Moderate', badge: 'bg-[#fff1d6] text-[#b9770e] border-[#fde68a]', bar: 'bg-[#b9770e]' }
  return { label: 'Optimal', badge: 'bg-[#e3f5e8] text-[#1f8a3d] border-[#86efac]', bar: 'bg-[#1f8a3d]' }
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

  useEffect(() => {
    loadInventory()
      .catch((err) => setLoadError(describeError(err, 'Could not load inventory.')))
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

  const filteredGroups = useMemo(() => {
    if (filter === 'CRITICAL') return BLOOD_GROUPS.filter((bg) => (editedValues[bg] ?? 0) < 5)
    if (filter === 'OPTIMAL') return BLOOD_GROUPS.filter((bg) => (editedValues[bg] ?? 0) >= 15)
    return BLOOD_GROUPS
  }, [filter, editedValues])

  return (
    <DashboardLayout active="Inventory" links={bloodBankSidebarLinks}>
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-extrabold mb-[6px]">Blood Bank Inventory</h1>
          <p className="text-muted">Manage real-time blood stock and perform bulk or inline updates.</p>
        </div>

        {/* Global Save Button at Header */}
        <div className="flex items-center gap-3">
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
        <div className="mb-6 p-4 rounded-2xl bg-[#e3f5e8] border border-[#86efac] text-[#1f8a3d] text-sm font-semibold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button type="button" onClick={() => setSaveSuccess('')} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Total Available Units</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">{kpis.total}</span>
            <span className="text-xs text-muted">units across all groups</span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Low / Critical Stock</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${kpis.lowCount > 0 ? 'text-[#d5233f]' : 'text-ink'}`}>
              {kpis.lowCount}
            </span>
            <span className="text-xs text-muted">groups &lt; 5 units</span>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl p-5 shadow-xs">
          <p className="text-muted text-xs font-semibold mb-1">Optimal Stock</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1f8a3d]">{kpis.optimalCount}</span>
            <span className="text-xs text-muted">groups &ge; 15 units</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { id: 'ALL', label: 'All Groups (8)' },
            { id: 'CRITICAL', label: `Low Stock (${kpis.lowCount})` },
            { id: 'OPTIMAL', label: `Optimal (${kpis.optimalCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                filter === tab.id
                  ? 'bg-ink text-white shadow-xs'
                  : 'bg-white text-muted border border-line hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasUnsavedChanges && (
          <span className="text-xs font-bold text-amber-700 bg-[#fff1d6] px-3.5 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Unsaved changes in {modifiedGroups.join(', ')}</span>
          </span>
        )}
      </div>

      {/* Inventory Grid Cards */}
      {loading ? (
        <p className="text-muted py-8">Loading inventory stock…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {filteredGroups.map((bg) => {
            const currentUnits = editedValues[bg] ?? 0
            const initialUnits = initialData[bg] ?? 0
            const isModified = currentUnits !== initialUnits
            const delta = currentUnits - initialUnits
            const status = getStockStatus(currentUnits)
            const isSavingThis = savingSingleGroup === bg

            return (
              <div
                key={bg}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm ${
                  isModified ? 'border-pink ring-2 ring-pink/20 bg-pink-light/10' : 'border-line hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark font-extrabold text-lg flex items-center justify-center shadow-inner">
                        {bg}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-ink">Type {bg}</h3>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${status.badge}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    {isModified && (
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          delta > 0 ? 'bg-[#e3f5e8] text-[#1f8a3d]' : 'bg-[#ffe1e1] text-[#d5233f]'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </div>

                  {/* Stock progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${status.bar}`}
                      style={{ width: `${Math.min(100, (currentUnits / 25) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  {/* Stepper controls */}
                  <div className="flex items-center justify-between gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-line">
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, -1, true)}
                      disabled={currentUnits <= 0}
                      className="w-8 h-8 rounded-lg bg-white border border-line font-bold text-base flex items-center justify-center text-ink hover:bg-slate-100 disabled:opacity-40 transition-colors"
                      title="Decrease by 1"
                    >
                      −
                    </button>

                    <div className="flex items-center justify-center gap-1 flex-1">
                      <input
                        type="number"
                        min="0"
                        value={currentUnits}
                        onChange={(e) => handleUnitChange(bg, e.target.value, false)}
                        className="w-16 text-center font-extrabold text-lg bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-pink rounded py-0.5 text-ink"
                      />
                      <span className="text-xs text-muted font-medium">units</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, 1, true)}
                      className="w-8 h-8 rounded-lg bg-white border border-line font-bold text-base flex items-center justify-center text-ink hover:bg-slate-100 transition-colors"
                      title="Increase by 1"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick delta buttons */}
                  <div className="flex items-center justify-between gap-1 mb-3">
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, -5, true)}
                      disabled={currentUnits <= 0}
                      className="flex-1 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-colors"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, 5, true)}
                      className="flex-1 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange(bg, 10, true)}
                      className="flex-1 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      +10
                    </button>
                  </div>

                  {/* Inline quick save */}
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
                </div>
              </div>
            )
          })}
        </div>
      )}

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
    </DashboardLayout>
  )
}

