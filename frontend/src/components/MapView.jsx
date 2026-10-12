import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { OSM_ATTRIBUTION, OSM_TILE_URL, pinIcon } from '../utils/map.js'

/**
 * Read-only map centred on one location. Renders nothing when the record has no
 * coordinates, so callers can fall back to plain venue text.
 */
export default function MapView({ latitude, longitude, label, height = 220, zoom = 15 }) {
  if (latitude == null || longitude == null) return null
  const position = [Number(latitude), Number(longitude)]

  return (
    <div className="rounded-[10px] overflow-hidden border border-line relative z-0 isolate" style={{ height }}>
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <Marker position={position} icon={pinIcon}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  )
}
