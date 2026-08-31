import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Phone, ExternalLink, Clock, CheckCircle2, Share2, Info } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import DonationNextSteps from '../components/DonationNextSteps.jsx'
import { usersApi } from '../api/index.js'
import { formatDateTime as formatDate } from '../utils/dates.js'
import { collectionCentre, donationStatus } from '../constants/donationStatus.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function PublishedRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [nextSteps, setNextSteps] = useState(null)
  const [sharedId, setSharedId] = useState(null)

  const refresh = useCallback(
    () => usersApi.getPublishedRequests().then(setRequests),
    [],
  )

  useEffect(() => {
    refresh()
      .catch(() => setError('Could not load published requests.'))
      .finally(() => setLoading(false))
  }, [refresh])

  async function confirmRespond() {
    const target = confirming
    await usersApi.respondToRequest(target.id)
    setConfirming(null)
    // Re-read so my_response_status comes from the server, not local state —
    // this is what keeps the commitment visible after a page reload.
    await refresh().catch(() => {})
    setNextSteps(target)
  }

  // Everything a matching donor needs to act: what is needed, where to go, and
  // a maps link. Used when this donor's own group cannot help.
  async function shareRequest(req) {
    const centre = collectionCentre(req)
    const lines = [
      `${req.blood_group_required} blood needed — ${req.units_required} unit(s) for ${req.patient_name}.`,
      req.hospital?.org_name ? `Hospital: ${req.hospital.org_name}` : null,
      centre ? `Donate at: ${centre.org_name}, ${centre.address}` : null,
      centre?.poc_contact ? `Contact: ${centre.poc_contact}` : null,
      centre?.latitude != null && centre?.longitude != null
        ? `Directions: https://www.google.com/maps/dir/?api=1&destination=${centre.latitude},${centre.longitude}`
        : null,
      req.compatible_donor_groups?.length
        ? `Eligible donor groups: ${req.compatible_donor_groups.join(', ')}`
        : null,
    ].filter(Boolean)
    const text = lines.join('\n')

    try {
      if (navigator.share) {
        await navigator.share({ title: `${req.blood_group_required} blood needed`, text })
      } else {
        await navigator.clipboard.writeText(text)
        setSharedId(req.id)
        setTimeout(() => setSharedId(null), 2500)
      }
    } catch {
      /* the user dismissed the share sheet — nothing to report */
    }
  }

  // A donor who already owes a donation should be finishing that one first.
  const pending = requests.filter((r) => r.my_response_status === 'ACCEPTED')

  return (
    <DashboardLayout active="Published Requests">
      <h1 className="text-[26px] font-extrabold mb-[6px]">Published Requests</h1>
      <p className="text-muted mb-6">
        Blood requests that blood banks couldn't fulfill from stock — donors and NGOs are needed.
      </p>

      {pending.length > 0 && (
        <div className="rounded-[14px] border border-[#f2467d] bg-pink-light px-5 py-4 mb-6">
          <p className="text-sm font-bold text-ink">
            You have {pending.length} donation{pending.length > 1 ? 's' : ''} still to give
          </p>
          <p className="text-muted text-[13px] mt-1">
            You've committed but haven't donated yet.{' '}
            {collectionCentre(pending[0])
              ? `Visit ${collectionCentre(pending[0]).org_name} to complete it.`
              : 'The blood bank will contact you with collection details.'}{' '}
            <button
              type="button"
              onClick={() => setNextSteps(pending[0])}
              className="text-pink-dark font-semibold bg-transparent border-none p-0"
            >
              See where to go →
            </button>
          </p>
        </div>
      )}

      {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted text-sm">No published requests right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req) => {
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
                    req.is_blood_type_match === false ? (
                      <button
                        type="button"
                        onClick={() => shareRequest(req)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{sharedId === req.id ? 'Copied!' : 'Share with a donor'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!req.is_eligible_now}
                        onClick={() => setConfirming(req)}
                        className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold bg-pink text-white shadow-[0_2px_8px_rgba(242,70,125,0.2)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        Respond / I'll Donate
                      </button>
                    )
                  )}
                </div>

                {req.is_blood_type_match === false && !mine && (
                  <p className="w-full mt-3 pt-3 border-t border-line text-xs text-muted flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>
                      This isn't your blood type — a patient needing{' '}
                      <strong className="text-ink">{req.blood_group_required}</strong> can only receive from{' '}
                      <strong className="text-ink">
                        {req.compatible_donor_groups?.length
                          ? req.compatible_donor_groups.join(', ')
                          : 'a matching group'}
                      </strong>
                      . If you know someone eligible, share this with them — it includes the collection
                      centre and directions.
                    </span>
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

      <p className="text-muted text-[13px] mt-8">
        Donations you've already given are listed in{' '}
        <Link to="/donation-history" className="text-pink-dark font-semibold">
          Donation History
        </Link>
        .
      </p>

      <ConfirmModal
        open={confirming !== null}
        title="Commit to donating?"
        tone="primary"
        confirmLabel="Yes, I'll donate"
        message={
          confirming
            ? `You're volunteering to donate ${confirming.blood_group_required} blood for ${confirming.patient_name}. The hospital and blood bank will be notified, and we'll show you exactly where to go.`
            : ''
        }
        onConfirm={confirmRespond}
        onCancel={() => setConfirming(null)}
      />

      <DonationNextSteps
        request={nextSteps}
        open={nextSteps !== null}
        onClose={() => setNextSteps(null)}
      />
    </DashboardLayout>
  )
}
