// Place lookup via Nominatim — the OpenStreetMap geocoder. Free, keyless, and
// the same data behind the tiles the maps already render.
//
// Nominatim's usage policy caps callers at roughly one request per second, so
// every caller must debounce and abort superseded requests. `searchPlaces`
// refuses queries shorter than MIN_QUERY_LENGTH for the same reason, and both
// helpers memoise results so retyping never re-hits the service.

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const MIN_QUERY_LENGTH = 3
const cache = new Map()
const CACHE_LIMIT = 100

function remember(key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
  cache.set(key, value)
  return value
}

async function getJson(path, params, signal) {
  const url = `${NOMINATIM}${path}?${new URLSearchParams(params)}`
  // Accept is CORS-safelisted, so this stays a simple request (no preflight).
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Place lookup failed (${res.status})`)
  return res.json()
}

/**
 * Splits Nominatim's long `display_name` into a headline and the rest, so a
 * suggestion can show "RIMS" in bold above "Bariatu, Ranchi, Jharkhand".
 */
function toSuggestion(row) {
  const parts = String(row.display_name ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  const primary = row.name || parts[0] || row.display_name
  const secondary = parts.filter((p) => p !== primary).join(', ')
  return {
    id: `${row.osm_type ?? 'x'}-${row.osm_id ?? row.place_id}`,
    primary,
    secondary,
    label: row.display_name,
    latitude: Number(row.lat),
    longitude: Number(row.lon),
  }
}

export { MIN_QUERY_LENGTH }

/** Free-text place search. Returns [] for queries too short to be worth a call. */
export async function searchPlaces(query, { signal, limit = 6 } = {}) {
  const q = query.trim()
  if (q.length < MIN_QUERY_LENGTH) return []

  const key = `s:${limit}:${q.toLowerCase()}`
  if (cache.has(key)) return cache.get(key)

  const rows = await getJson('/search', { q, format: 'jsonv2', limit: String(limit) }, signal)
  return remember(key, rows.map(toSuggestion))
}

/** Turns a dropped pin back into a human address. Returns '' if nothing matches. */
export async function reverseGeocode(latitude, longitude, { signal } = {}) {
  if (latitude == null || longitude == null) return ''

  const lat = Number(latitude).toFixed(5)
  const lon = Number(longitude).toFixed(5)
  const key = `r:${lat},${lon}`
  if (cache.has(key)) return cache.get(key)

  const row = await getJson('/reverse', { lat, lon, format: 'jsonv2' }, signal)
  return remember(key, row?.display_name ?? '')
}
