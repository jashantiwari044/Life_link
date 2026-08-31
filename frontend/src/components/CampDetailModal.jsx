import { Calendar, MapPin, Phone, Compass, Check, Building2 } from 'lucide-react'
import Modal from './Modal.jsx'
import MapView from './MapView.jsx'
import { directionsUrl } from '../utils/map.js'
import { formatDateTime } from '../utils/dates.js'

const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-50'
const outlineBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold bg-white text-ink border border-line transition-all duration-150 hover:-translate-y-px hover:border-pink hover:text-pink-dark disabled:opacity-50'

/**
 * Donation camp detail overlay. Shows the venue on a live map when the NGO
 * pinned it, and falls back to the plain venue text for older camps.
 */
export default function CampDetailModal({ camp, open, onClose, onRegister, registering, registered, error }) {
  if (!camp) return null

  const hasCoordinates = camp.latitude != null && camp.longitude != null

  return (
    <Modal
      open={open}
      title={camp.title}
      onClose={onClose}
      footer={
        <>
          {hasCoordinates && (
            <a
              href={directionsUrl(camp.latitude, camp.longitude)}
              target="_blank"
              rel="noreferrer noopener"
              className={outlineBtn}
            >
              <Compass className="w-3.5 h-3.5 text-pink-dark" />
              <span>Get Directions</span>
            </a>
          )}
          {onRegister && (
            <button type="button" className={primaryBtn} disabled={registering || registered} onClick={onRegister}>
              {registered ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Registered</span>
                </>
              ) : registering ? (
                'Registering…'
              ) : (
                'Register to Attend'
              )}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {camp.ngo?.org_name && (
          <div className="flex items-center gap-2.5 text-sm pb-2 border-b border-line">
            <Building2 className="w-4 h-4 text-pink-dark shrink-0" />
            <span className="text-muted text-xs font-semibold">Organized by:</span>
            <span className="font-bold text-ink">{camp.ngo.org_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 text-sm">
          <Calendar className="w-4 h-4 text-pink-dark shrink-0" />
          <span className="font-semibold text-ink">{formatDateTime(camp.date_time)}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <MapPin className="w-4 h-4 text-pink-dark shrink-0" />
          <span className="font-semibold text-ink">{camp.venue}</span>
        </div>
        {camp.contact_info && (
          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-semibold text-ink">{camp.contact_info}</span>
          </div>
        )}

        {hasCoordinates ? (
          <div className="mt-2 rounded-xl overflow-hidden border border-line">
            <MapView latitude={camp.latitude} longitude={camp.longitude} label={camp.title} />
          </div>
        ) : (
          <p className="text-muted text-[13px] mt-2">
            The organiser hasn't pinned this camp on the map yet — use the venue address above.
          </p>
        )}

        {error && <p className="text-pink-dark text-xs font-semibold">{error}</p>}
      </div>
    </Modal>
  )
}
