import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Phone,
  Truck,
  X,
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Send,
  PauseCircle,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LocationView from '../../components/LocationView.jsx'
import LoadError from '../../components/LoadError.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'
import { btnPrimary } from '../../constants/buttonStyles.js'
import { formatDateTime as formatDate } from '../../utils/dates.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

const mapPriorityToUrgency = (p) => {
  if (p === 'EMERGENCY') return 'CRITICAL'
  if (p === 'URGENT') return 'HIGH'
  if (p === 'PLANNED') return 'MEDIUM'
  if (['CRITICAL', 'HIGH', 'MEDIUM'].includes(p)) return p
  return 'HIGH'
}

const statusBadge = {
  PENDING: { label: 'Awaiting Blood Bank Decision', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ON_HOLD: { label: 'On Hold (Stock Shortage)', cls: 'bg-red-50 text-red-700 border-red-200' },
  OPEN: { label: 'On Hold (Stock Shortage)', cls: 'bg-red-50 text-red-700 border-red-200' },
  READY_FOR_DISPATCH: { label: 'Stock Allocated / Ready to Dispatch', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  DISPATCHED: { label: 'Blood In Transit', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  BLOOD_RECEIVED: { label: 'Received & Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function SubmitRequestTracking() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [request, setRequest] = useState(null)
  const [stockUnits, setStockUnits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Shortage modal
  const [showShortageModal, setShowShortageModal] = useState(false)
  const [modalError, setModalError] = useState('')
  const [shortageForm, setShortageForm] = useState({
    units_needed: 5,
    urgency: 'HIGH',
    message: '',
  })
  const [alertSubmitting, setAlertSubmitting] = useState(false)
  const [alertSuccess, setAlertSuccess] = useState('')

  function loadData() {
    if (!id) return Promise.resolve()
    return Promise.all([
      bloodBankApi.getRequestDetail(id),
      bloodBankApi.getInventory(),
    ]).then(([req, inventory]) => {
      setRequest(req)
      const row = inventory.find((i) => i.blood_group === req.blood_group_required)
      setStockUnits(row ? row.units_available : 0)
    })
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    loadData()
      .catch((err) => setLoadError(describeError(err, 'Could not load this requisition.')))
      .finally(() => setLoading(false))
  }, [id])

  async function handleFulfill() {
    setError('')
    setBusy(true)
    try {
      const updated = await bloodBankApi.processFulfillment(id)
      setRequest(updated)
      await loadData().catch(() => {})
      if (updated.status === 'READY_FOR_DISPATCH') {
        setSuccessMsg('Blood allocated from inventory! Requisition is ready for dispatch.')
      } else {
        setSuccessMsg('Insufficient inventory: requisition has been placed on hold.')
      }
    } catch (err) {
      setError(describeError(err, 'Could not fulfill this requisition.'))
    } finally {
      setBusy(false)
    }
  }

  async function handlePutOnHold() {
    setError('')
    setBusy(true)
    try {
      const updated = await bloodBankApi.putOnHold(id)
      setRequest(updated)
      setSuccessMsg('Requisition placed on hold due to insufficient inventory.')
    } catch (err) {
      setError(describeError(err, 'Could not put this requisition on hold.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDispatch() {
    setError('')
    setBusy(true)
    try {
      const updated = await bloodBankApi.markDispatched(id)
      setRequest(updated)
      setSuccessMsg('Requisition marked as dispatched to the hospital!')
    } catch (err) {
      setError(describeError(err, 'Could not mark this requisition dispatched.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleSendShortageAlert(e) {
    e.preventDefault()
    setAlertSubmitting(true)
    setModalError('')
    try {
      await bloodBankApi.createShortageAlert({
        blood_group: request.blood_group_required,
        units_needed: parseInt(shortageForm.units_needed, 10),
        urgency: shortageForm.urgency,
        message: shortageForm.message.trim(),
      })
      // Also ensure requisition is on hold
      if (request.status !== 'ON_HOLD') {
        await bloodBankApi.putOnHold(id).then(setRequest).catch(() => {})
      }
      setShowShortageModal(false)
      setAlertSuccess('Shortage alert broadcasted to all NGOs to organize a donation drive!')
      setTimeout(() => setAlertSuccess(''), 5000)
    } catch (err) {
      const msg = describeError(err, 'Failed to broadcast shortage alert.')
      setModalError(msg)
      setError(msg)
    } finally {
      setAlertSubmitting(false)
    }
  }

  const hasEnoughStock = stockUnits >= (request?.units_required ?? 0)

  return (
    <DashboardLayout active="Incoming Requests" links={bloodBankSidebarLinks}>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            Hospital Requisition Tracking
          </h1>
          <p className="text-muted text-sm">
            {request ? `Requisition BL${1000 + Number(request.id)} from ${request.hospital?.org_name ?? 'Hospital'}` : 'Review requisition details'}
          </p>
        </div>
        <Link
          to="/bloodbank/requests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incoming Requests</span>
        </Link>
      </div>

      <LoadError message={loadError} />

      {successMsg && (
        <div className="mb-6 max-w-[640px] p-4 rounded-2xl bg-[#e3f5e8] border border-[#86efac] text-[#1f8a3d] text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#1f8a3d] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {alertSuccess && (
        <div className="mb-6 max-w-[640px] p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-center gap-3 shadow-xs">
          <BellRing className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{alertSuccess}</span>
        </div>
      )}

      {loading ? (
        <p className="text-muted py-8">Loading requisition details…</p>
      ) : !request ? (
        <p className="text-muted text-sm">Open this page from Incoming Requests to review a requisition.</p>
      ) : (
        <div className="flex flex-col gap-6 max-w-[640px]">
          {/* Main Details Card */}
          <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                <span>{request.hospital?.org_name ?? 'Requesting Hospital'}</span>
              </h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[request.priority]}`}>
                {request.priority}
              </span>
            </div>

            <dl className="flex flex-col gap-3 mb-6">
              <div className="flex justify-between text-sm py-2 border-b border-line">
                <dt className="text-muted text-xs">Blood Group Required</dt>
                <dd className="font-black text-sm text-pink-dark">{request.blood_group_required}</dd>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-line">
                <dt className="text-muted text-xs">Units Requested</dt>
                <dd className="font-extrabold text-sm text-ink">{request.units_required} unit(s)</dd>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-line bg-slate-50 px-3 rounded-lg">
                <dt className="text-slate-600 text-xs font-bold">Current Bank Stock ({request.blood_group_required})</dt>
                <dd className={`font-black text-sm ${hasEnoughStock ? 'text-[#1f8a3d]' : 'text-[#d5233f]'}`}>
                  {stockUnits} unit(s) available
                </dd>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-line">
                <dt className="text-muted text-xs">Requisition Status</dt>
                <dd>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[request.status]?.cls ?? 'bg-slate-100 text-slate-700'}`}>
                    {statusBadge[request.status]?.label ?? request.status}
                  </span>
                </dd>
              </div>
              {request.emergency_reason && (
                <div className="flex justify-between text-sm py-2 border-b border-line">
                  <dt className="text-muted text-xs">Department / Note</dt>
                  <dd className="font-medium text-xs text-slate-700">{request.emergency_reason}</dd>
                </div>
              )}
              <div className="flex justify-between text-sm py-2">
                <dt className="text-muted text-xs">Submitted Time</dt>
                <dd className="font-semibold text-xs text-ink">{formatDate(request.created_at)}</dd>
              </div>
            </dl>

            {request.hospital && (
              <LocationView
                className="mb-6"
                label="Deliver to Hospital"
                name={request.hospital.org_name}
                address={request.hospital.address}
                latitude={request.hospital.latitude}
                longitude={request.hospital.longitude}
                height={160}
              />
            )}

            {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

            {/* ACTION SECTION */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              {/* If pending or on hold: Decide to fulfill from stock OR put on hold and alert NGOs */}
              {(request.status === 'PENDING' || request.status === 'ON_HOLD' || request.status === 'OPEN') && (
                <div className="space-y-3">
                  {hasEnoughStock ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-bold text-emerald-800 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Sufficient inventory available ({stockUnits} units in stock / {request.units_required} requested).</span>
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleFulfill}
                        className={btnPrimary}
                      >
                        {busy ? 'Allocating Stock…' : 'Fulfill from Stock & Prepare Dispatch'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                      <p className="text-xs font-bold text-amber-900 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Insufficient Inventory: Bank currently has {stockUnits} unit(s) of {request.blood_group_required}, but {request.units_required} units are requested.
                        </span>
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        {request.status !== 'ON_HOLD' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handlePutOnHold}
                            className="flex-1 py-2.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
                          >
                            <PauseCircle className="w-4 h-4 text-slate-500" />
                            <span>Put On Hold</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setModalError('')
                            setShortageForm({
                              units_needed: Math.max(1, request.units_required - stockUnits),
                              urgency: mapPriorityToUrgency(request.priority),
                              message: `Shortage for hospital requisition: ${request.hospital?.org_name ?? 'Hospital'} urgently needs ${request.units_required} units of ${request.blood_group_required}. Current bank stock is ${stockUnits}.`,
                            })
                            setShowShortageModal(true)
                          }}
                          className="flex-1 py-2.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <BellRing className="w-4 h-4" />
                          <span>Request NGOs to Organize Blood Drive</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ready for dispatch */}
              {request.status === 'READY_FOR_DISPATCH' && (
                <div className="flex flex-col gap-3 p-5 bg-[#e3f5e8] border border-[#86efac] rounded-2xl">
                  <div className="flex items-center gap-2 text-[#1f8a3d] font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Blood units allocated from stock! Ready for dispatch packaging.</span>
                  </div>
                  <button type="button" disabled={busy} className={btnPrimary} onClick={handleDispatch}>
                    {busy ? 'Dispatching…' : 'Mark Dispatched to Hospital'}
                  </button>
                </div>
              )}

              {/* Dispatched */}
              {request.status === 'DISPATCHED' && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Dispatched to {request.hospital?.org_name}. Awaiting hospital delivery confirmation.</span>
                </div>
              )}

              {/* Delivered */}
              {request.status === 'BLOOD_RECEIVED' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Requisition completed — blood successfully delivered to and received by hospital.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shortage Alert Modal to trigger NGO drive */}
      {showShortageModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-line relative animate-scale-up">
            <button
              type="button"
              onClick={() => setShowShortageModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-ink p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Notify NGOs to Mobilize Drive</h3>
                <p className="text-xs text-muted">Broadcast shortage to partnering NGOs to schedule a blood donation camp.</p>
              </div>
            </div>

            <form onSubmit={handleSendShortageAlert} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Blood Group in Shortage
                </label>
                <input
                  type="text"
                  disabled
                  value={request?.blood_group_required}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm font-bold bg-slate-100 text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Units Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={shortageForm.units_needed}
                    onChange={(e) => setShortageForm({ ...shortageForm, units_needed: e.target.value })}
                    className="w-full px-3 py-2 border border-line rounded-xl text-sm font-semibold focus:outline-none focus:border-pink"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Urgency
                  </label>
                  <select
                    value={shortageForm.urgency}
                    onChange={(e) => setShortageForm({ ...shortageForm, urgency: e.target.value })}
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
                  Shortage Message to NGOs
                </label>
                <textarea
                  rows="3"
                  value={shortageForm.message}
                  onChange={(e) => setShortageForm({ ...shortageForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-line rounded-xl text-sm focus:outline-none focus:border-pink"
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#d5233f] text-xs font-semibold">
                  {modalError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShortageModal(false)}
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
