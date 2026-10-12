import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL, pinIcon } from '../utils/map.js'
import { reverseGeocode } from '../utils/geocode.js'

function ClickCapture({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)))
    },
  })
  return null
}

/**
 * Flies the map whenever `token` changes. Driven by a token rather than by the
 * coordinates themselves so that dragging or clicking the map — which also
 * changes the coordinates — never yanks the view out from under the user.
 */
function FlyTo({ token, latitude, longitude, zoom = 16 }) {
  const map = useMap()
  const lastToken = useRef(token)

  useEffect(() => {
    if (token === lastToken.current) return
    lastToken.current = token
    if (latitude == null || longitude == null) return
    map.flyTo([Number(latitude), Number(longitude)], zoom, { duration: 0.8 })
  }, [token, latitude, longitude, zoom, map])

  return null
}

/**
 * Location picker on OpenStreetMap tiles (no API key).
 *
 * The pin can be placed three ways: by the caller (typically from an address
 * search — bump `flyToToken` to make the map follow), by clicking the map, or
 * from the browser's own geolocation. Whatever lands, the picker looks the spot
 * back up and shows the address, so the NGO can confirm it pinned the right
 * place — and copy that address into the venue field with one click.
 */
export default function MapPicker({
  latitude,
  longitude,
  onChange,
  onAddressResolved,
  flyToToken = 0,
  height = 260,
}) {
  const hasPin = latitude != null && longitude != null
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [internalToken, setInternalToken] = useState(0)

  const center = useMemo(
    () => (hasPin ? [Number(latitude), Number(longitude)] : DEFAULT_CENTER),
    // Initial view only; FlyTo handles every move after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Name whatever the pin is currently sitting on.
  useEffect(() => {
    if (!hasPin) {
      setAddress('')
      return undefined
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      reverseGeocode(latitude, longitude, { signal: controller.signal })
        .then(setAddress)
        .catch(() => setAddress(''))
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [hasPin, latitude, longitude])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('This browser cannot share your location.')
      return
    }
    setLocationError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)))
        setInternalToken((t) => t + 1)
        setLocating(false)
      },
      () => {
        setLocationError('Could not get your location. Search the address or tap the map instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-[10px] overflow-hidden border border-line relative z-0 isolate" style={{ height }}>
        <MapContainer center={center} zoom={hasPin ? 15 : 11} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <FlyTo token={`${flyToToken}:${internalToken}`} latitude={latitude} longitude={longitude} />
          <ClickCapture
            onPick={(lat, lng) => {
              setLocationError('')
              onChange(lat, lng)
            }}
          />
          {hasPin && (
            <Marker
              position={[Number(latitude), Number(longitude)]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng()
                  onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {hasPin ? (
            <>
              <p
                className="text-ink text-xs font-semibold break-words line-clamp-2 flex items-center gap-1.5"
                title={address || undefined}
              >
                <MapPin className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                <span>{address || `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`}</span>
              </p>
              <p className="text-muted text-xs mt-[2px]">Drag the pin or tap the map to fine-tune.</p>
            </>
          ) : (
            <p className="text-muted text-xs">
              Search the address above, tap the map, or use your current location.
            </p>
          )}
        </div>

        <div className="flex gap-3 shrink-0">
          {hasPin && address && onAddressResolved && (
            <button
              type="button"
              onClick={() => onAddressResolved(address)}
              className="text-pink-dark text-xs font-semibold bg-transparent border-none p-0"
            >
              Use as venue
            </button>
          )}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="text-pink-dark text-xs font-semibold bg-transparent border-none p-0 disabled:opacity-50"
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          {hasPin && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="text-muted text-xs font-semibold bg-transparent border-none p-0"
            >
              Clear pin
            </button>
          )}
        </div>
      </div>

      {locationError && <p className="text-muted text-xs">{locationError}</p>}
    </div>
  )
}
