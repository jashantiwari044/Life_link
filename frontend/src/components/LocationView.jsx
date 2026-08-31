import { MapPin, Navigation } from 'lucide-react'
import MapView from './MapView.jsx'
import { directionsUrl } from '../utils/map.js'
import { addressSearchUrl } from '../constants/donationStatus.js'

/**
 * Read-only location block: the address, a map when the place has been pinned,
 * and a directions link either way.
 *
 * Records saved before the map picker existed have no coordinates, so the
 * directions link falls back to a Google Maps address search — still one tap,
 * just without the inline map.
 */
export default function LocationView({
  name,
  address,
  label = 'Location',
  latitude,
  longitude,
  height = 200,
  compact = false,
  className = '',
}) {
  if (!name && !address && latitude == null) return null

  const pinned = latitude != null && longitude != null
  const href = pinned ? directionsUrl(latitude, longitude) : address ? addressSearchUrl(address) : null

  return (
    <div className={`border border-line rounded-2xl overflow-hidden bg-white ${className}`}>
      <div className="p-4">
        {label && (
          <p className="text-muted text-[11px] uppercase tracking-[0.4px] font-semibold mb-1">{label}</p>
        )}
        {name && <p className="text-sm font-bold text-ink">{name}</p>}
        {address && (
          <p className="text-muted text-xs mt-1 flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
            <span className="break-words">{address}</span>
          </p>
        )}

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-full text-xs font-bold bg-white text-ink border border-line transition-all hover:-translate-y-px hover:border-pink hover:text-pink-dark"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Get Directions</span>
          </a>
        )}
      </div>

      {pinned && !compact && (
        <MapView latitude={latitude} longitude={longitude} label={name || address} height={height} />
      )}
    </div>
  )
}
