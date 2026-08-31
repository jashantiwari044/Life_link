import { useState } from 'react'
import PlaceSearchInput from './PlaceSearchInput.jsx'
import MapPicker from './MapPicker.jsx'

/**
 * The address input used everywhere in the app: type to search real places,
 * pick one to drop the pin, or adjust it by tapping/dragging the map. Same
 * behaviour the donation drive form uses.
 *
 * Coordinates are optional throughout — a free-text address the geocoder has
 * never heard of stays valid, it just won't carry a pin.
 *
 * Controlled by the parent:
 *   value      – the address text
 *   latitude   – pin latitude or null
 *   longitude  – pin longitude or null
 *   onChange({ address, latitude, longitude }) – called on every change
 */
export default function AddressField({
  id = 'address',
  label = 'Address',
  hint = "Start typing and pick a suggestion — we'll drop the map pin for you.",
  placeholder = 'Street, City, State',
  value = '',
  latitude = null,
  longitude = null,
  onChange,
  error,
  labelClass = 'text-[13px] font-semibold text-ink',
  errorClass = 'text-pink-dark text-xs font-semibold',
  inputClassName = 'border border-line rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink',
  mapHeight = 220,
}) {
  // Bumped whenever the pin moves from somewhere other than the map itself,
  // so the map follows a search result instead of leaving it off-screen.
  const [flyToToken, setFlyToToken] = useState(0)

  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className={labelClass}>{label}</label>
      {hint && <p className="text-muted text-xs">{hint}</p>}

      <PlaceSearchInput
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(address) => onChange({ address, latitude, longitude })}
        onSelect={(place) => {
          onChange({ address: place.label, latitude: place.latitude, longitude: place.longitude })
          setFlyToToken((t) => t + 1)
        }}
        className={inputClassName}
      />
      {error && <span className={errorClass}>{error}</span>}

      <div className="mt-1">
        <MapPicker
          latitude={latitude}
          longitude={longitude}
          flyToToken={flyToToken}
          height={mapHeight}
          onChange={(lat, lng) => onChange({ address: value, latitude: lat, longitude: lng })}
          onAddressResolved={(resolved) => onChange({ address: resolved, latitude, longitude })}
        />
      </div>
    </div>
  )
}
