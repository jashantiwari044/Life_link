import { Check, Compass, MapPin, Phone, UserCheck } from 'lucide-react'
import Modal from './Modal.jsx'
import MapView from './MapView.jsx'
import { directionsUrl } from '../utils/map.js'
import { addressSearchUrl, collectionCentre } from '../constants/donationStatus.js'

const outlineBtn =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark'
const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark'

function Step({ n, title, children, done }) {
  return (
    <li className="flex gap-3">
      <span
        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 text-[11px] font-bold shrink-0 ${
          done ? 'bg-[#1f8a3d] text-white border-[#1f8a3d]' : 'bg-white text-muted border-line'
        }`}
      >
        {done ? <Check className="w-3 h-3" /> : n}
      </span>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-muted text-[13px] mt-[2px]">{children}</p>
      </div>
    </li>
  )
}

/**
 * Shown the moment a donor commits to a request. Answers the only questions
 * that matter at that point: where do I go, what do I bring, and when does this
 * actually count as done.
 */
export default function DonationNextSteps({ request, open, onClose }) {
  if (!request) return null

  const centre = collectionCentre(request)

  return (
    <Modal
      open={open}
      title="Thank you — here's where to go"
      onClose={onClose}
      footer={
        <>
          {(centre?.address || centre?.latitude != null) && (
            <a
              href={
                centre.latitude != null && centre.longitude != null
                  ? directionsUrl(centre.latitude, centre.longitude)
                  : addressSearchUrl(centre.address)
              }
              target="_blank"
              rel="noreferrer noopener"
              className={outlineBtn}
            >
              <Compass className="w-3.5 h-3.5 text-pink-dark" />
              <span>Get Directions</span>
            </a>
          )}
          <button type="button" className={primaryBtn} onClick={onClose}>
            Got it
          </button>
        </>
      }
    >
      <div className="rounded-xl bg-pink-light px-4 py-3 mb-5 border border-pink/20">
        <p className="text-sm font-bold text-ink">
          {request.blood_group_required} · {request.units_required} unit(s) for {request.patient_name}
        </p>
        {request.hospital?.org_name && (
          <p className="text-muted text-[13px] mt-[2px]">Treating hospital: {request.hospital.org_name}</p>
        )}
      </div>

      {centre ? (
        <div className="border border-line rounded-xl p-4 mb-5 bg-slate-50">
          <p className="text-muted text-[11px] uppercase font-bold tracking-wider mb-1">Donate at (Collection Centre)</p>
          <p className="text-sm font-bold text-ink">{centre.org_name}</p>
          <p className="text-muted text-[13px] mt-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-pink-dark shrink-0" />
            <span>{centre.address}</span>
          </p>
          {centre.poc_contact && (
            <p className="text-muted text-[13px] mt-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{centre.poc_contact} {centre.poc_name ? `(Contact: ${centre.poc_name})` : ''}</span>
            </p>
          )}
          {centre.latitude != null && centre.longitude != null && (
            <div className="mt-3 rounded-lg overflow-hidden border border-line">
              <MapView
                latitude={centre.latitude}
                longitude={centre.longitude}
                label={centre.org_name}
                height={180}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted text-sm mb-5">
          The blood bank handling this request will contact you on your registered number with
          collection details.
        </p>
      )}

      <ol className="flex flex-col gap-4">
        <Step n={1} title="You've committed to donate" done>
          The hospital, blood bank, and patient have all been notified.
        </Step>
        <Step n={2} title="Visit the collection centre">
          Carry a photo ID. Eat properly and drink water before you go.
        </Step>
        <Step n={3} title="The blood bank verifies your donation">
          Until they check you in, this donation counts as pending — not complete.
        </Step>
        <Step n={4} title="The hospital confirms it received the blood">
          Only then does the request close. We'll notify you when it does.
        </Step>
      </ol>
    </Modal>
  )
}
