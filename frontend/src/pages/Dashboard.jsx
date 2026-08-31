import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Droplet,
  Megaphone,
  CheckCircle2,
  Building2,
  MapPin,
  Phone,
  Calendar,
  ExternalLink,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import LoadError from '../components/LoadError.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import DonationNextSteps from '../components/DonationNextSteps.jsx'
import CampDetailModal from '../components/CampDetailModal.jsx'
import { usersApi, bloodRequestsApi, campsApi, ApiError, describeError } from '../api/index.js'
import { formatDate } from '../utils/dates.js'
import { ACTIVE_STATUSES } from '../constants/requestStatus.js'
import { collectionCentre, donationStatus } from '../constants/donationStatus.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [donorMode, setDonorMode] = useState(false)
  const [myRequests, setMyRequests] = useState([])
  const [publishedRequests, setPublishedRequests] = useState([])
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedCamp, setSelectedCamp] = useState(null)
  const [registeredCampIds, setRegisteredCampIds] = useState([])
  const [registering, setRegistering] = useState(false)
  const [campError, setCampError] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmingRespond, setConfirmingRespond] = useState(null)
  const [nextSteps, setNextSteps] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [profile, requests, published, camps, registrations] = await Promise.all([
        usersApi.getMe(),
        bloodRequestsApi.mine(),
        usersApi.getPublishedRequests().catch(() => []),
        campsApi.list(3),
        campsApi.myRegistrations().catch(() => []),
      ])
      setUser(profile)
      setDonorMode(profile.donor_mode_enabled)
      setMyRequests(requests || [])
      setPublishedRequests(published || [])
      setDrives(camps || [])
      setRegisteredCampIds((registrations || []).map((r) => r.camp_id))
    } catch (err) {
      setLoadError(describeError(err, 'Could not load your dashboard.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleRegisterForCamp() {
    if (!selectedCamp) return
    setCampError('')
    setRegistering(true)
    try {
      await campsApi.register(selectedCamp.id)
      setRegisteredCampIds((ids) => [...ids, selectedCamp.id])
    } catch (err) {
      setCampError(
        err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not register for this drive.',
      )
    } finally {
      setRegistering(false)
    }
  }

  async function toggleDonorMode() {
    const next = !donorMode
    setDonorMode(next)
    setActionError('')
    try {
      const updated = await usersApi.setDonorMode(next)
      setUser(updated)
      const updatedPublished = await usersApi.getPublishedRequests().catch(() => [])
      setPublishedRequests(updatedPublished)
    } catch (err) {
      setDonorMode(!next)
      setActionError(describeError(err, 'Could not update donor mode.'))
    }
  }

  async function confirmRespond() {
    const target = confirmingRespond
    setActionError('')
    try {
      await usersApi.respondToRequest(target.id)
      setConfirmingRespond(null)
      await loadData()
      setNextSteps(target)
    } catch (err) {
      setActionError(describeError(err, 'Could not commit to donating.'))
      setConfirmingRespond(null)
    }
  }

  if (loading && !user) {
    return (
      <DashboardLayout active="Dashboard">
        <p className="text-muted py-8">Loading dashboard…</p>
      </DashboardLayout>
    )
  }

  if (loadError && !user) {
    return (
      <DashboardLayout active="Dashboard">
        <LoadError message={loadError} />
      </DashboardLayout>
    )
  }

  const activeRequests = myRequests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const pendingCommitments = publishedRequests.filter((r) => r.my_response_status === 'ACCEPTED')

  return (
    <DashboardLayout active="Dashboard" user={{ name: user?.full_name }}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Welcome back, {user?.full_name} 👋
        </h1>
        <p className="text-muted text-sm">Real-time emergency blood requests and community donation network.</p>
      </div>

      <LoadError message={actionError} />

      {/* Action Buttons */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <Link
          to="/request-blood"
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold bg-pink text-white shadow-[0_4px_16px_rgba(242,70,125,0.3)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark"
        >
          <Droplet className="w-4 h-4 fill-white" />
          <span>Request Blood</span>
        </Link>
        <button
          type="button"
          className={
            donorMode
              ? 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold bg-[#1f8a3d] text-white shadow-[0_4px_16px_rgba(31,138,61,0.25)] transition-all duration-150 hover:-translate-y-px hover:bg-[#186f31]'
              : 'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink'
          }
          onClick={toggleDonorMode}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{donorMode ? 'Donor Mode: ON (Ready to Donate)' : 'Become Available to Donate'}</span>
        </button>
      </div>

      {/* Pending Donation Commitment Alert */}
      {pendingCommitments.length > 0 && (
        <div className="rounded-2xl border border-pink/30 bg-pink-light/70 p-4 sm:p-5 mb-8 shadow-xs flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-[240px] flex-1">
            <Clock className="w-5 h-5 text-pink-dark shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-ink">
                You have {pendingCommitments.length} donation commitment{pendingCommitments.length > 1 ? 's' : ''} pending
              </p>
              <p className="text-muted text-xs mt-1">
                Please visit the designated blood bank to complete your donation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNextSteps(pendingCommitments[0])}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
          >
            <span>See where to go</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SECTION: Open / Published Blood Requests Needing Donors */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-pink-dark" />
              <span>Open Requests Needing Donors</span>
            </h2>
            <p className="text-muted text-xs">Emergency requests published to community donors.</p>
          </div>
          <Link to="/published-requests" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>View All ({publishedRequests.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {publishedRequests.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No open emergency requests at this moment.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {publishedRequests.map((req) => {
              const mine = req.my_response_status ? donationStatus(req.my_response_status) : null
              const centre = collectionCentre(req)
              return (
                <div key={req.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all duration-150 hover:border-slate-300">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                          {req.blood_group_required}
                        </span>
                        <span className="text-sm font-bold text-ink">
                          {req.units_required} unit(s) needed for {req.patient_name}
                        </span>
                        <span className="text-xs text-muted">· {formatDate(req.created_at)}</span>
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${urgencyBadge[req.priority]}`}>
                      {req.priority}
                    </span>

                    {mine ? (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${mine.badge}`}>
                        {mine.label}
                      </span>
                    ) : (
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                          req.is_blood_type_match === false
                            ? 'bg-slate-100 text-muted border border-slate-200'
                            : req.is_eligible_now
                            ? 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200'
                            : 'bg-slate-100 text-muted'
                        }`}
                      >
                        {req.is_blood_type_match === false ? (
                          'Not your blood type'
                        ) : req.is_eligible_now ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Eligible now</span>
                          </>
                        ) : (
                          'Not eligible'
                        )}
                      </span>
                    )}

                    {mine ? (
                      <button
                        type="button"
                        onClick={() => setNextSteps(req)}
                        className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark"
                      >
                        {mine.done ? 'View details' : 'Where to go →'}
                      </button>
                    ) : (
                      <Link
                        to="/published-requests"
                        className={
                          req.is_blood_type_match === false
                            ? 'inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark'
                            : 'hidden'
                        }
                      >
                        Share with a donor
                      </Link>
                    )}
                    {!mine && req.is_blood_type_match !== false && (
                      <button
                        type="button"
                        disabled={!req.is_eligible_now}
                        onClick={() => setConfirmingRespond(req)}
                        className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold bg-pink text-white shadow-[0_2px_8px_rgba(242,70,125,0.2)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        Respond / I'll Donate
                      </button>
                    )}
                  </div>

                  {req.is_blood_type_match === false && !mine && (
                    <p className="w-full mt-3 pt-3 border-t border-line text-xs text-muted">
                      This isn't your blood type — a patient needing{' '}
                      <strong className="text-ink">{req.blood_group_required}</strong> can only receive from{' '}
                      <strong className="text-ink">
                        {req.compatible_donor_groups?.length
                          ? req.compatible_donor_groups.join(', ')
                          : 'a matching group'}
                      </strong>
                      . Open Published Requests to share it with someone eligible.
                    </p>
                  )}

                  {/* Comprehensive Location & Directions Box */}
                  <div className="w-full mt-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col gap-2">
                    <div className="flex items-start gap-2.5 text-slate-800">
                      <Building2 className="w-4 h-4 text-pink-dark shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-700">Hospital: </span>
                        <span className="font-semibold">{req.hospital?.org_name ?? 'Community Request'}</span>
                        {req.hospital?.address && <span className="text-slate-500"> — {req.hospital.address}</span>}
                      </div>
                    </div>

                    {centre ? (
                      <div className="flex items-start justify-between gap-2 text-slate-800 flex-wrap pt-2 border-t border-slate-200">
                        <div className="flex items-start gap-2.5">
                          <Building2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-700">Where to Donate (Blood Bank): </span>
                            <span className="font-semibold text-pink-dark">{centre.org_name}</span>
                            <span className="text-slate-600 block mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-pink-dark shrink-0" />
                              {centre.address}
                            </span>
                            {centre.poc_contact && (
                              <span className="text-slate-500 text-[11px] block mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Contact: {centre.poc_contact} {centre.poc_name ? `(${centre.poc_name})` : ''}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {centre.address && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(centre.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-pink-dark hover:underline inline-flex items-center gap-1 self-center bg-white border border-line px-3 py-1.5 rounded-full shadow-2xs"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[11px] pt-1.5 border-t border-slate-200">
                        ℹ️ Collection centre location will be assigned by the hospital.
                      </div>
                    )}
                  </div>

                  {mine && !mine.done && (
                    <p className="text-[#b9770e] text-xs font-semibold mt-3 pt-3 border-t border-line flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{mine.summary} Please visit {centre?.org_name ?? 'the blood bank'} to give blood.</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Active User Requests */}
      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink">My Raised Requests</h2>
        {activeRequests.length === 0 ? (
          <p className="text-muted text-sm">You haven't raised any blood requests yet.</p>
        ) : (
          <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                  <th className="text-left px-5 py-3.5">No.</th>
                  <th className="text-left px-5 py-3.5">Blood</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-left px-5 py-3.5">Hospital</th>
                  <th className="text-left px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeRequests.map((req) => (
                  <tr key={req.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold">#{String(req.id).padStart(2, '0')}</td>
                    <td className="px-5 py-3.5 font-extrabold text-pink-dark">{req.blood_group_required}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{req.hospital?.org_name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <Link to="/my-requests" className="text-pink-dark font-bold text-xs hover:underline inline-flex items-center gap-1">
                        <span>Track Live</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Upcoming Donation Drives */}
      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink">Upcoming Donation Drives</h2>
        {drives.length === 0 ? (
          <p className="text-muted text-sm">No upcoming drives right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drives.map((drive) => (
              <button
                type="button"
                className="bg-white border border-line rounded-2xl p-5 text-left transition-all duration-150 hover:-translate-y-1 hover:border-pink hover:shadow-sm group"
                key={drive.id}
                onClick={() => {
                  setCampError('')
                  setSelectedCamp(drive)
                }}
              >
                <h3 className="text-base mb-2 font-bold text-ink group-hover:text-pink-dark transition-colors line-clamp-1">
                  {drive.title}
                </h3>
                <p className="text-muted text-xs mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                  <span>{formatDate(drive.date_time)}</span>
                </p>
                <p className="text-muted text-xs mb-3 flex items-center gap-1.5 line-clamp-1">
                  <MapPin className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                  <span>{drive.venue}</span>
                </p>
                <span className="text-pink-dark text-xs font-bold inline-flex items-center gap-1">
                  <span>{drive.latitude != null ? 'View on map' : 'View details'}</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <ConfirmModal
        open={confirmingRespond !== null}
        title="Commit to donating?"
        tone="primary"
        confirmLabel="Yes, I'll donate"
        message={
          confirmingRespond
            ? `You're volunteering to donate ${confirmingRespond.blood_group_required} blood for ${confirmingRespond.patient_name}. The hospital and blood bank will be notified, and we'll show you exactly where to go.`
            : ''
        }
        onConfirm={confirmRespond}
        onCancel={() => setConfirmingRespond(null)}
      />

      <DonationNextSteps
        request={nextSteps}
        open={nextSteps !== null}
        onClose={() => setNextSteps(null)}
      />

      <CampDetailModal
        camp={selectedCamp}
        open={selectedCamp !== null}
        onClose={() => setSelectedCamp(null)}
        registering={registering}
        registered={selectedCamp ? registeredCampIds.includes(selectedCamp.id) : false}
        error={campError}
        onRegister={handleRegisterForCamp}
      />
    </DashboardLayout>
  )
}
