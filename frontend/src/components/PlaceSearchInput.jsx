import { useEffect, useId, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { MIN_QUERY_LENGTH, searchPlaces } from '../utils/geocode.js'

const DEBOUNCE_MS = 600

/**
 * Address field that doubles as a place search. Typing suggests real locations;
 * picking one reports both the address text and its coordinates through
 * `onSelect(place)`, so the caller can move a map pin to match.
 *
 * The typed value is always kept — a free-text venue that the geocoder has never
 * heard of stays perfectly valid, it just won't come with coordinates.
 */
export default function PlaceSearchInput({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  ...inputProps
}) {
  const listId = useId()
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  // Skip the lookup for text we just wrote ourselves after a pick.
  const skipNextLookup = useRef(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false
      return undefined
    }
    const query = (value ?? '').trim()
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setError('')
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      searchPlaces(query, { signal: controller.signal })
        .then((results) => {
          setSuggestions(results)
          setHighlighted(-1)
          setOpen(true)
        })
        .catch((err) => {
          if (err.name === 'AbortError') return
          setSuggestions([])
          setError("Couldn't reach the place search. You can still drop the pin on the map.")
        })
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value])

  // Clicking anywhere else dismisses the dropdown.
  useEffect(() => {
    function onDocumentClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocumentClick)
    return () => document.removeEventListener('mousedown', onDocumentClick)
  }, [])

  function pick(place) {
    skipNextLookup.current = true
    onChange(place.label)
    onSelect?.(place)
    setOpen(false)
    setSuggestions([])
    setHighlighted(-1)
  }

  function onKeyDown(e) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      pick(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        className={`${className} w-full`}
        {...inputProps}
      />

      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">Searching…</span>
      )}

      {/* z-[1100] clears Leaflet's controls (z-index 1000), since this list
          overlays a map sitting directly below the field. */}
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-[1100] left-0 right-0 mt-1 bg-white border border-line rounded-[10px] shadow-[0_12px_30px_rgba(0,0,0,0.12)] max-h-[240px] overflow-y-auto"
        >
          {suggestions.map((place, index) => (
            <li key={place.id} role="option" aria-selected={index === highlighted}>
              <button
                type="button"
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => pick(place)}
                className={`w-full text-left px-4 py-[10px] border-b border-line last:border-b-0 ${
                  index === highlighted ? 'bg-pink-light/60' : 'bg-white'
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <MapPin className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                  <span>{place.primary}</span>
                </span>
                {place.secondary && (
                  <span className="block text-muted text-xs mt-[2px] pl-5">{place.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-muted text-xs mt-1">{error}</p>}
    </div>
  )
}
