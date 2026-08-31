import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  User,
  Phone,
  Truck,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LocationView from '../../components/LocationView.jsx'
import LoadError from '../../components/LoadError.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, ApiError, describeError } from '../../api/index.js'
import { btnPrimary } from '../../constants/buttonStyles.js'
import { formatDateTime as formatDate } from '../../utils/dates.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function SubmitRequestTracking() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [request, setRequest] = useState(null)
  const [stockUnits, setStockUnits] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [confirmingVerify, setConfirmingVerify] = useState(null)
  const [busy, setBusy] = useState(false)

  function loadData() {
    if (!id) return Promise.resolve()
    return Promise.all([
      bloodBankApi.getRequestDetail(id),
      bloodBankApi.getInventory(),
      bloodBankApi.listCommunityResponses(),
    ]).then(([req, inventory, allResponses]) => {
      setRequest(req)
      const row = inventory.find((i) => i.blood_group === req.blood_group_required)
      setStockUnits(row ? row.units_available : 0)
      setResponses(allResponses.filter((r) => r.request_id === req.id))
    })
  }

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    loadData()
      .catch((err) => setLoadError(describeError(err, 'Could not load this request.')))
      .finally(() => setLoading(false))
  }, [id])

  async function handleProcess() {
    setError('')
    setBusy(true)
    try {
      const updated = await bloodBankApi.processFulfillment(id)
      setRequest(updated)
      await loadData().catch(() => {})
    } catch (err) {
      setError(describeError(err, 'Could not process this request.'))
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
    } catch (err) {
      setError(describeError(err, 'Could not mark this request dispatched.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(resp) {
    setError('')
    setSuccessMsg('')
    setBusy(true)
    try {
      await bloodBankApi.verifyCommunityResponse(resp.id)
      setConfirmingVerify(null)
      await loadData()
      setSuccessMsg(`Blood collection verified from ${responderName(resp)}! Request is now Ready for Dispatch.`)
    } catch (err) {
      setError(describeError(err, 'Could not verify blood collection.'))
    } finally {
      setBusy(false)
    }
  }

  function responderName(resp) {
    if (resp.donor) return resp.donor.full_name
    if (resp.ngo) return resp.ngo.org_name
    if (resp.responder_type === 'NGO') return 'NGO volunteer'
    return `Response #${resp.id}`
  }

  return (
    <DashboardLayout active="Incoming Requests" links={bloodBankSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Request Tracking</h1>
      <p className="text-muted text-sm mb-6">{id ? `Request ID: BL${1000 + Number(id)}` : 'No request selected.'}</p>

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

      {loading ? (
        <p className="text-muted py-8">Loading request details…</p>
      ) : !request ? (
        <p className="text-muted text-sm">Open this page from Incoming Requests to review a request.</p>
      ) : (
        <div className="flex flex-col gap-6 max-w-[640px]">
          {/* Request details card */}
          <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-ink">{request.hospital?.org_name ?? 'Community'}</h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[request.priority]}`}>
                {request.priority}
              </span>
            </div>

            <dl className="flex flex-col gap-3 mb-8">
              <div className="flex justify-between text-sm py-1.5 border-b border-line">
                <dt className="text-muted text-xs">Patient</dt>
                <dd className="font-semibold text-xs text-ink">{request.patient_name}</dd>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-line">
                <dt className="text-muted text-xs">Blood Group</dt>
                <dd className="font-extrabold text-xs text-pink-dark">{request.blood_group_required}</dd>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-b border-line">
                <dt className="text-muted text-xs">Units Required</dt>
                <dd className="font-semibold text-xs text-ink">{request.units_required} unit(s)</dd>
              </div>
              {(request.status === 'VERIFIED' || request.status === 'OPEN') && (
                <div className="flex justify-between text-sm py-1.5 border-b border-line">
                  <dt className="text-muted text-xs">Current Stock ({request.blood_group_required})</dt>
                  <dd className="font-semibold text-xs text-ink">{stockUnits} unit(s)</dd>
                </div>
              )}
              <div className="flex justify-between text-sm py-1.5 border-b border-line">
                <dt className="text-muted text-xs">Status</dt>
                <dd className="font-semibold text-xs text-ink">{request.status}</dd>
              </div>
              {request.fulfillment_type && (
                <div className="flex justify-between text-sm py-1.5 border-b border-line">
                  <dt className="text-muted text-xs">Fulfillment</dt>
                  <dd className="font-semibold text-xs text-ink">{request.fulfillment_type === 'DIRECT' ? 'From stock' : 'Community donation'}</dd>
                </div>
              )}
              <div className="flex justify-between text-sm py-1.5">
                <dt className="text-muted text-xs">Submitted</dt>
                <dd className="font-semibold text-xs text-ink">{formatDate(request.created_at)}</dd>
              </div>
            </dl>

            {request.hospital && (
              <LocationView
                className="mb-6"
                label="Deliver to"
                name={request.hospital.org_name}
                address={request.hospital.address}
                latitude={request.hospital.latitude}
                longitude={request.hospital.longitude}
                height={180}
              />
            )}

            {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

            {request.status === 'VERIFIED' && (
              <button type="button" disabled={busy} className={btnPrimary} onClick={handleProcess}>
                Check Inventory &amp; Process
              </button>
            )}

            {request.status === 'READY_FOR_DISPATCH' && (
              <div className="flex flex-col gap-3 p-5 bg-[#e3f5e8] border border-[#86efac] rounded-2xl">
                <div className="flex items-center gap-2 text-[#1f8a3d] font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Blood secured &amp; ready for dispatch!</span>
                </div>
                <button type="button" disabled={busy} className={btnPrimary} onClick={handleDispatch}>
                  Mark Dispatched to Hospital
                </button>
              </div>
            )}

            {request.status === 'PENDING' && (
              <p className="text-xs font-semibold text-[#b9770e] flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Awaiting hospital verification — no action available yet.</span>
              </p>
            )}

            {request.status === 'OPEN' && (
              <div className="flex flex-col gap-3 p-5 bg-[#fffaf0] border border-amber-200 rounded-2xl">
                <p className="text-xs font-semibold text-[#b9770e] flex items-start gap-1.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Stock was short, so this is published to donors and NGOs. When a donor arrives,
                    verify their collection. If your stock has since been topped up — say a walk-in
                    donor gave blood after someone shared this request — re-check it here to fulfil
                    directly and stand the volunteers down.
                  </span>
                </p>
                <button type="button" disabled={busy} className={btnPrimary} onClick={handleProcess}>
                  Re-check Inventory &amp; Fulfil ({stockUnits}/{request.units_required} in stock)
                </button>
              </div>
            )}

            {request.status === 'DISPATCHED' && (
              <p className="text-xs font-semibold text-[#1f8a3d] flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>Dispatched to hospital. Awaiting hospital confirmation.</span>
              </p>
            )}

            {request.status === 'BLOOD_RECEIVED' && (
              <p className="text-xs font-semibold text-[#1f8a3d] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Request fulfilled — blood received by hospital.</span>
              </p>
            )}
          </div>

          {/* Community responses for this request */}
          {responses.length > 0 && (
            <div>
              <h3 className="text-base font-bold mb-3 text-ink">Donor &amp; NGO Pickup Locations</h3>
              <div className="flex flex-col gap-3">
                {responses.map((resp) => {
                  const isCollected = resp.status === 'BLOOD_COLLECTED'
                  const locationAddress = resp.ngo?.address ?? resp.donor?.address ?? 'Location not provided'
                  return (
                    <div key={resp.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-bold text-ink">{responderName(resp)}</p>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                              {resp.responder_type === 'NGO' ? <Building2 className="w-3 h-3 text-slate-600" /> : <User className="w-3 h-3 text-slate-600" />}
                              <span>{resp.responder_type === 'NGO' ? 'NGO Partner' : 'Citizen Donor'}</span>
                            </span>
                          </div>
                          <p className="text-muted text-xs mt-1">
                            {resp.donor
                              ? `Blood Group: ${resp.donor.blood_group} · Contact: ${resp.donor.phone_number}`
                              : resp.ngo?.poc_contact
                              ? `POC: ${resp.ngo.poc_name} · Contact: ${resp.ngo.poc_contact}`
                              : ''}
                            {' · '}Committed on {formatDate(resp.timestamp)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                              isCollected
                                ? 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200'
                                : 'bg-[#fff1d6] text-[#b9770e] border border-amber-200'
                            }`}
                          >
                            {isCollected ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#1f8a3d]" />
                                <span>Blood Collected</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-[#b9770e]" />
                                <span>Awaiting Collection</span>
                              </>
                            )}
                          </span>
                          {!isCollected && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmingVerify(resp)}
                              className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-bold bg-pink text-white shadow-[0_2px_8px_rgba(242,70,125,0.2)] transition-all hover:-translate-y-px hover:bg-pink-dark"
                            >
                              Verify &amp; Collect
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Pickup / Location Details Card */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-pink-dark shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="font-bold text-slate-700">
                            {resp.responder_type === 'NGO' ? 'NGO Pickup Location / Address:' : "Donor's Address / Location:"}
                          </span>
                          <p className="text-slate-900 font-semibold text-xs mt-0.5 leading-snug">
                            {locationAddress}
                          </p>
                          {resp.ngo?.registration_number_hrf_id && (
                            <p className="text-slate-500 text-[11px] mt-1">
                              HRF Registration ID: {resp.ngo.registration_number_hrf_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmingVerify !== null}
        title="Verify Blood Collection?"
        tone="primary"
        confirmLabel="Yes, Blood Received"
        message={
          confirmingVerify
            ? `Confirm that you have received and collected blood from ${responderName(confirmingVerify)} for ${request?.patient_name ?? 'the patient'}. This will mark the blood collected and set the request to Ready for Dispatch.`
            : ''
        }
        onConfirm={() => handleVerify(confirmingVerify)}
        onCancel={() => setConfirmingVerify(null)}
      />
    </DashboardLayout>
  )
}
