import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  Droplet,
  CheckCircle2,
  Clock,
  Phone,
  Building2,
  User,
  X,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'
import { formatDate, formatDateTime } from '../../utils/dates.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function DonationLogs() {
  const [donorLogs, setDonorLogs] = useState([])
  const [awaitingDonors, setAwaitingDonors] = useState([])
  const [directFulfillments, setDirectFulfillments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [confirmingVerify, setConfirmingVerify] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  async function loadData() {
    const [logsData, awaitingData, allRequests] = await Promise.all([
      bloodBankApi.getDonationLogs().catch(() => []),
      bloodBankApi.listCommunityResponses('ACCEPTED').catch(() => []),
      bloodBankApi.getIncomingRequests({ include_completed: true }).catch(() => []),
    ])
    setDonorLogs(logsData || [])
    setAwaitingDonors(awaitingData || [])
    const direct = (allRequests || []).filter(
      (r) => r.fulfillment_type === 'DIRECT' || (r.status === 'BLOOD_RECEIVED' && !r.fulfillment_type)
    )
    setDirectFulfillments(direct)
  }

  useEffect(() => {
    loadData()
      .catch((err) => setLoadError(describeError(err, 'Could not load donation logs.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleVerify(response) {
    setSuccessMsg('')
    try {
      await bloodBankApi.verifyCommunityResponse(response.id)
      setConfirmingVerify(null)
      await loadData()
      setSuccessMsg(`Successfully verified and logged blood collection from ${who(response)}!`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setLoadError(describeError(err, 'Could not verify donation.'))
    }
  }

  function who(entry) {
    if (entry.donor) return entry.donor.full_name
    if (entry.ngo) return entry.ngo.org_name
    if (entry.responder_type === 'NGO') return 'NGO Volunteer'
    return `Response #${entry.id}`
  }

  return (
    <DashboardLayout active="Donation Logs" links={bloodBankSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Donation &amp; Fulfillment Logs</h1>
      <p className="text-muted text-sm mb-6">Complete log of direct inventory dispatches and donor blood collections.</p>

      <LoadError message={loadError} />

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-[#e3f5e8] border border-[#86efac] text-[#1f8a3d] text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#1f8a3d] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {/* Top summary cards */}
      <div className="flex gap-4 flex-wrap mb-10">
        <div className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Direct Stock Fulfillments</p>
          <p className="text-2xl font-extrabold text-ink">{directFulfillments.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Verified Donor Collections</p>
          <p className="text-2xl font-extrabold text-[#1f8a3d]">{donorLogs.length}</p>
        </div>
        {awaitingDonors.length > 0 && (
          <div className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs">
            <p className="text-[#b9770e] text-xs mb-1 font-semibold">Awaiting Collection</p>
            <p className="text-2xl font-extrabold text-[#b9770e]">{awaitingDonors.length}</p>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading logs…</p>
      ) : (
        <>
          {/* SECTION 1: Direct Inventory Fulfillments */}
          <section className="mb-12">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink flex items-center gap-2">
              <Package className="w-5 h-5 text-pink-dark" />
              <span>Direct Inventory Fulfillments</span>
            </h2>
            {directFulfillments.length === 0 ? (
              <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
                No direct inventory fulfillments recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                      <th className="text-left px-5 py-3.5">Hospital</th>
                      <th className="text-left px-5 py-3.5">Patient</th>
                      <th className="text-left px-5 py-3.5">Blood Group</th>
                      <th className="text-left px-5 py-3.5">Units</th>
                      <th className="text-left px-5 py-3.5">Source</th>
                      <th className="text-left px-5 py-3.5">Status</th>
                      <th className="text-left px-5 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directFulfillments.map((req) => (
                      <tr key={req.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-ink">{req.hospital?.org_name ?? '—'}</td>
                        <td className="px-5 py-3.5">{req.patient_name}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                            {req.blood_group_required}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold">{req.units_required} unit(s)</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            Direct from Inventory Stock
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
                            {req.status === 'BLOOD_RECEIVED' ? 'Received by Hospital' : req.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted text-xs">{formatDate(req.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SECTION 2: Donor Blood Collections */}
          <section className="mb-10">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink flex items-center gap-2">
              <Droplet className="w-5 h-5 text-pink-dark fill-pink-dark" />
              <span>Donor Blood Collections &amp; Commitments</span>
            </h2>
            {donorLogs.length === 0 && awaitingDonors.length === 0 ? (
              <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
                No donor blood collections recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                      <th className="text-left px-5 py-3.5">Donor</th>
                      <th className="text-left px-5 py-3.5">Blood Group</th>
                      <th className="text-left px-5 py-3.5">Patient / Request</th>
                      <th className="text-left px-5 py-3.5">Type</th>
                      <th className="text-left px-5 py-3.5">Status</th>
                      <th className="text-left px-5 py-3.5">Date</th>
                      <th className="text-left px-5 py-3.5">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...awaitingDonors, ...donorLogs].map((d) => {
                      const isCollected = d.status === 'BLOOD_COLLECTED'
                      return (
                        <tr key={d.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-ink">{who(d)}</p>
                            {d.donor?.phone_number && (
                              <p className="text-muted text-xs mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{d.donor.phone_number}</span>
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                              {d.donor?.blood_group ?? d.request?.blood_group_required ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-ink font-medium">
                            {d.request?.patient_name ?? `Request #${d.request_id}`}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted font-medium">{d.responder_type}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                isCollected
                                  ? 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200'
                                  : 'bg-[#fff1d6] text-[#b9770e] border border-amber-200'
                              }`}
                            >
                              {isCollected ? 'Blood Collected' : 'Awaiting Collection'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-muted text-xs">
                            {formatDateTime(d.timestamp)}
                          </td>
                          <td className="px-5 py-3.5">
                            {!isCollected ? (
                              <button
                                type="button"
                                onClick={() => setConfirmingVerify(d)}
                                className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-bold bg-pink text-white shadow-xs transition-all hover:bg-pink-dark"
                              >
                                Verify &amp; Collect
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-[#1f8a3d] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmModal
        open={confirmingVerify !== null}
        title="Log Blood Collection?"
        tone="primary"
        confirmLabel="Yes, Blood Collected"
        message={
          confirmingVerify
            ? `Confirm that ${who(confirmingVerify)} has given blood. This records the collection in donation logs and marks it verified.`
            : ''
        }
        onConfirm={() => handleVerify(confirmingVerify)}
        onCancel={() => setConfirmingVerify(null)}
      />
    </DashboardLayout>
  )
}
