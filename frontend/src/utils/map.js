import L from 'leaflet'

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Ranchi — a sane starting view before the user has picked anything.
export const DEFAULT_CENTER = [23.3441, 85.3096]

// Leaflet's default marker points at PNGs it resolves relative to the CSS, which
// bundlers rewrite away. A divIcon keeps the pin self-contained.
export const pinIcon = L.divIcon({
  className: '',
  html:
    '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#f2467d;' +
    'border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
})

export function directionsUrl(latitude, longitude) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}
