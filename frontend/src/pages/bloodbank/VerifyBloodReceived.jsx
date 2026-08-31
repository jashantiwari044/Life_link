import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Phone, Clock, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LocationView from '../../components/LocationView.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi } from '../../api/index.js'
import { formatDateTime } from '../../utils/dates.js'

export default function VerifyBloodReceived() {
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [justVerified, setJustVerified] = useState(null)

  const refresh = useCallback(
    () => bloodBankApi.listCommunityResponses('ACCEPTED').then(setResponses),
    [],
  )

  useEffect(() => {
    refresh()
      .catch(() => setError('Could not load donors awaiting collection.'))
      .finally(() => setLoading(false))
  }, [refresh])

  async function confirmVerify() {
    const target = confirming
    await bloodBankApi.verifyCommunityResponse(target.id)
    setConfirming(null)
    setJustVerified(target)
    await refresh().catch(() => {})
  }

  // A donor's pin lives on their user record, an NGO's on the organization.
  function pickupLocation(entry) {
    if (entry.donor) {
      return {
        name: entry.donor.full_name,
        address: entry.donor.address,
        latitude: entry.donor.current_lat,
        longitude: entry.donor.current_lng,
        label: 'Donor location',
      }
    }
    if (entry.ngo) {
      return {
        name: entry.ngo.org_name,
        address: entry.ngo.address,
        latitude: entry.ngo.latitude,
        longitude: entry.ngo.longitude,
        label: 'NGO location',
      }
    }
    return null
  }

  function who(entry) {
    if (entry.donor) return entry.donor.full_name
    if (entry.ngo) return entry.ngo.org_name
    if (entry.responder_type === 'NGO') return 'NGO volunteer'
    return `Response #${entry.id}`
  }

  return (
    <DashboardLayout active="Donation Logs" links={bloodBankSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Verify Blood Received</h1>
      <p className="text-muted text-sm mb-6">
        Donors and NGOs who committed to a request assigned to you. Verify each one when they turn up
        and give blood — this is what moves the request forward for the hospital.
      </p>

      {justVerified && (
        <div className="rounded-2xl bg-[#e3f5e8] border border-[#86efac] px-5 py-4 mb-6 shadow-xs">
          <p className="text-sm font-bold text-[#1f8a3d] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Logged {who(justVerified)}'s donation</span>
          </p>
          <p className="text-[#1f8a3d] text-xs mt-1">
            The request is now ready for dispatch, and the donor has been thanked.
          </p>
        </div>
      )}

      {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted py-8">Loading…</p>
      ) : responses.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          No one is awaiting collection right now. Donors appear here as soon as they respond to a
          request assigned to your blood bank.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {responses.map((entry) => (
            <div key={entry.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-sm font-bold text-ink">{who(entry)}</p>
                  <p className="text-muted text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                    {entry.donor && (
                      <>
                        <span className="font-extrabold text-pink-dark">{entry.donor.blood_group}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {entry.donor.phone_number}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>Committed {formatDateTime(entry.timestamp)}</span>
                  </p>
                  <p className="text-slate-600 text-xs mt-1">
                    For <strong className="text-ink font-semibold">{entry.request?.patient_name ?? `request #${entry.request_id}`}</strong>
                    {entry.request?.blood_group_required
                      ? ` · needs ${entry.request.blood_group_required} × ${entry.request.units_required}`
                      : ''}
                    {entry.request?.hospital?.org_name ? ` · ${entry.request.hospital.org_name}` : ''}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fff1d6] text-[#b9770e] border border-amber-200">
                  Awaiting collection
                </span>
                <button
                  type="button"
                  onClick={() => setConfirming(entry)}
                  className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold bg-pink text-white shadow-xs transition-all hover:bg-pink-dark"
                >
                  Verify &amp; Log Donation
                </button>
              </div>

              {(() => {
                const place = pickupLocation(entry)
                if (!place || (!place.address && place.latitude == null)) return null
                return (
                  <LocationView
                    className="mt-4"
                    label={place.label}
                    name={place.name}
                    address={place.address}
                    latitude={place.latitude}
                    longitude={place.longitude}
                    height={170}
                  />
                )
              })()}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirming !== null}
        title="Log this donation?"
        tone="primary"
        confirmLabel="Yes, blood collected"
        message={
          confirming
            ? `Confirm that ${who(confirming)} has given blood. This records the donation, updates their last donation date, and moves the request to ready for dispatch.`
            : ''
        }
        onConfirm={confirmVerify}
        onCancel={() => setConfirming(null)}
      />
    </DashboardLayout>
  )
}
