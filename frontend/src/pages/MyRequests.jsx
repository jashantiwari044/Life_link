import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Droplet,
  Plus,
  Building2,
  MapPin,
  Phone,
  ArrowRight,
  XCircle,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import LocationView from '../components/LocationView.jsx'
import LoadError from '../components/LoadError.jsx'
import StatusTimeline from '../components/StatusTimeline.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { bloodRequestsApi, describeError } from '../api/index.js'
import { formatDate, formatDateTime } from '../utils/dates.js'
import { ACTIVE_STATUSES, CANCELLABLE_STATUSES, statusBadgeClass } from '../constants/requestStatus.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-6 text-sm py-2 border-b border-line last:border-b-0">
      <dt className="text-muted shrink-0 text-xs font-medium">{label}</dt>
      <dd className="font-semibold text-right break-words min-w-0 text-xs text-ink">{children ?? '—'}</dd>
    </div>
  )
}

function PastRequestsTable({ requests }) {
  if (requests.length === 0) {
    return (
      <div className="bg-white border border-line rounded-2xl p-6 text-muted text-sm shadow-xs">
        No past blood requests found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
            <th className="text-left px-5 py-3.5">No.</th>
            <th className="text-left px-5 py-3.5">Blood</th>
            <th className="text-left px-5 py-3.5">Units</th>
            <th className="text-left px-5 py-3.5">Date</th>
            <th className="text-left px-5 py-3.5">Hospital</th>
            <th className="text-left px-5 py-3.5">Status</th>
            <th className="text-left px-5 py-3.5">Action</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
              <td className="px-5 py-3.5 font-bold">#{String(req.id).padStart(2, '0')}</td>
              <td className="px-5 py-3.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                  {req.blood_group_required}
                </span>
              </td>
              <td className="px-5 py-3.5 font-medium">{req.units_required} unit(s)</td>
              <td className="px-5 py-3.5 text-muted text-xs">{formatDate(req.created_at)}</td>
              <td className="px-5 py-3.5 text-muted text-xs">{req.hospital?.org_name ?? '—'}</td>
              <td className="px-5 py-3.5">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusBadgeClass(req.status)}`}>
                  {req.status}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <Link to={`/my-requests/${req.id}`} className="text-pink-dark font-bold text-xs hover:underline inline-flex items-center gap-1">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function MyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedActiveIndex, setSelectedActiveIndex] = useState(0)
  const [pendingCancel, setPendingCancel] = useState(null)

  async function refresh() {
    const data = await bloodRequestsApi.mine()
    setRequests(data)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setLoadError(describeError(err, 'Could not load your requests.')))
      .finally(() => setLoading(false))
  }, [])

  async function confirmCancel() {
    if (!pendingCancel) return
    try {
      await bloodRequestsApi.cancel(pendingCancel.id)
      await refresh()
      setPendingCancel(null)
    } catch (err) {
      setLoadError(describeError(err, 'Could not cancel this request.'))
      setPendingCancel(null)
    }
  }

  const activeRequests = requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const pastRequests = requests.filter((r) => !ACTIVE_STATUSES.includes(r.status))

  const currentActive = activeRequests[selectedActiveIndex] || activeRequests[0]

  return (
    <DashboardLayout active="My Requests">
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">My Blood Requests</h1>
          <p className="text-muted text-sm">Live status journey and tracking for your active and historical blood requests.</p>
        </div>
        <Link
          to="/request-blood"
          className="inline-flex items-center justify-center gap-2 rounded-full font-bold bg-pink text-white px-5 py-2.5 text-xs shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark"
        >
          <Plus className="w-4 h-4" />
          <span>Request Blood</span>
        </Link>
      </div>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted py-8">Loading your requests…</p>
      ) : (
        <>
          {/* Active Request Live Section */}
          <section className="mb-12">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
                <span>Active Blood Request</span>
                {activeRequests.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1f8a3d] animate-pulse" />
                )}
              </h2>

              {/* Multi-request selector pills if user has > 1 active request */}
              {activeRequests.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {activeRequests.map((req, idx) => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setSelectedActiveIndex(idx)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        selectedActiveIndex === idx
                          ? 'bg-pink text-white shadow-xs'
                          : 'bg-white border border-line text-muted hover:text-ink'
                      }`}
                    >
                      Request #{String(req.id).padStart(2, '0')} ({req.blood_group_required})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeRequests.length === 0 ? (
              <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
                You have no active blood requests right now.{' '}
                <Link to="/request-blood" className="text-pink-dark font-semibold hover:underline">
                  Raise a new request →
                </Link>
              </div>
            ) : currentActive ? (
              <div className="flex flex-col gap-6">
                {/* Active Request Summary Banner */}
                <div className="bg-white border border-line rounded-2xl p-5 shadow-xs flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-extrabold text-sm border border-pink/20">
                      {currentActive.blood_group_required}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-ink">
                        Request #{String(currentActive.id).padStart(2, '0')}
                      </h3>
                      <p className="text-muted text-xs">
                        Raised on {formatDateTime(currentActive.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadgeClass(currentActive.status)}`}>
                    {currentActive.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Request Details Card */}
                  <div className="bg-white border border-line rounded-2xl p-6 shadow-xs">
                    <h4 className="text-base font-bold mb-4 text-ink">Request Details</h4>
                    <dl className="flex flex-col">
                      <Row label="Patient Name">{currentActive.patient_name}</Row>
                      <Row label="Blood Group Required">
                        <span className="text-pink-dark font-extrabold">{currentActive.blood_group_required}</span>
                      </Row>
                      <Row label="Units Required">{currentActive.units_required} unit(s)</Row>
                      <Row label="Priority">
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${urgencyBadge[currentActive.priority]}`}>
                          {currentActive.priority}
                        </span>
                      </Row>
                      <Row label="Hospital">{currentActive.hospital?.org_name}</Row>
                      {currentActive.hospital?.address && <Row label="Hospital Address">{currentActive.hospital.address}</Row>}
                      {currentActive.hospital?.poc_contact && <Row label="Hospital Contact">{currentActive.hospital.poc_contact}</Row>}
                      {currentActive.emergency_reason && <Row label="Notes">{currentActive.emergency_reason}</Row>}
                    </dl>

                    {CANCELLABLE_STATUSES.includes(currentActive.status) && (
                      <button
                        type="button"
                        onClick={() => setPendingCancel(currentActive)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold bg-white text-[#d5233f] border border-[#d5233f] transition-all hover:bg-red-50 mt-6"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel This Request</span>
                      </button>
                    )}

                    {currentActive.hospital && (
                      <LocationView
                        className="mt-6"
                        label="Treating hospital"
                        name={currentActive.hospital.org_name}
                        address={currentActive.hospital.address}
                        latitude={currentActive.hospital.latitude}
                        longitude={currentActive.hospital.longitude}
                        height={170}
                      />
                    )}

                    {currentActive.assigned_blood_bank && (
                      <LocationView
                        className="mt-4"
                        label="Blood bank handling this"
                        name={currentActive.assigned_blood_bank.org_name}
                        address={currentActive.assigned_blood_bank.address}
                        latitude={currentActive.assigned_blood_bank.latitude}
                        longitude={currentActive.assigned_blood_bank.longitude}
                        height={170}
                      />
                    )}
                  </div>

                  {/* Status Timeline / Live Progression */}
                  <div className="bg-white border border-line rounded-2xl p-6 shadow-xs">
                    <h4 className="text-base font-bold mb-1 text-ink">Live Status Journey</h4>
                    <p className="text-muted text-xs mb-5">
                      Real-time status tracking from hospital verification to blood dispatch.
                    </p>
                    <StatusTimeline status={currentActive.status} />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Past Requests Section */}
          <section className="mb-10">
            <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink">Past Requests History</h2>
            <PastRequestsTable requests={pastRequests} />
          </section>
        </>
      )}

      <ConfirmModal
        open={pendingCancel !== null}
        title="Cancel Blood Request?"
        message={
          pendingCancel
            ? `Request #${String(pendingCancel.id).padStart(2, '0')} for ${pendingCancel.units_required} unit(s) of ${pendingCancel.blood_group_required} will be withdrawn. This action cannot be undone.`
            : ''
        }
        confirmLabel="Yes, Cancel Request"
        onConfirm={confirmCancel}
        onCancel={() => setPendingCancel(null)}
      />
    </DashboardLayout>
  )
}
