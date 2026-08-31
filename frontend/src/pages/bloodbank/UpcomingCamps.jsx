import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  MapPin,
  Phone,
  ArrowRight,
  Search,
  Building2,
  Tent,
  HeartHandshake,
  Clock,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import CampDetailModal from '../../components/CampDetailModal.jsx'
import { campsApi, describeError } from '../../api/index.js'
import { formatDateTime } from '../../utils/dates.js'

export default function UpcomingCamps() {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    campsApi
      .list()
      .then((data) => setCamps(data))
      .catch((err) => setLoadError(describeError(err, 'Could not load donation drives.')))
      .finally(() => setLoading(false))
  }, [])

  const filteredCamps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return camps
    return camps.filter((c) => {
      const titleMatch = (c.title || '').toLowerCase().includes(q)
      const venueMatch = (c.venue || '').toLowerCase().includes(q)
      const ngoMatch = (c.ngo?.org_name || '').toLowerCase().includes(q)
      return titleMatch || venueMatch || ngoMatch
    })
  }, [camps, query])

  return (
    <DashboardLayout active="Donation Drives" links={bloodBankSidebarLinks}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
            NGO Donation Drives &amp; Camps
          </h1>
          <p className="text-muted text-sm">
            Live blood donation drives published by partner NGOs across the network.
          </p>
        </div>

        <div className="relative min-w-[240px] sm:w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search drives, NGOs, or venues…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border border-line rounded-full pl-9 pr-4 py-2 text-xs font-medium text-ink placeholder:text-muted focus:outline-none focus:border-pink transition-all shadow-xs"
          />
        </div>
      </div>

      {loadError && <p className="text-pink-dark text-sm font-semibold mb-4">{loadError}</p>}

      {loading ? (
        <p className="text-muted py-8">Loading donation drives…</p>
      ) : filteredCamps.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-pink-light text-pink-dark flex items-center justify-center mx-auto mb-3">
            <Tent className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink mb-1">No Donation Drives Found</h3>
          <p className="text-muted text-xs max-w-sm mx-auto">
            {query
              ? `No upcoming drives matching "${query}". Try searching with a different term.`
              : 'There are no upcoming NGO donation drives scheduled right now.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCamps.map((camp) => (
            <div
              key={camp.id}
              onClick={() => setSelected(camp)}
              className="bg-white border border-line rounded-2xl p-5 text-left shadow-xs transition-all hover:border-pink hover:-translate-y-0.5 group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-light text-pink-dark border border-pink/20 truncate max-w-[190px]">
                    <HeartHandshake className="w-3 h-3 shrink-0" />
                    <span className="truncate">{camp.ngo?.org_name ?? 'Partner NGO'}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#1f8a3d] bg-[#e3f5e8] px-2 py-0.5 rounded-full">
                    {camp.status || 'Active'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-ink group-hover:text-pink-dark transition-colors line-clamp-2 mb-3">
                  {camp.title}
                </h3>

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Calendar className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                    <span className="font-medium text-slate-700">{formatDateTime(camp.date_time)}</span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted">
                    <MapPin className="w-3.5 h-3.5 text-pink-dark shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{camp.venue}</span>
                  </div>

                  {camp.contact_info && (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{camp.contact_info}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-line/70 flex items-center justify-between">
                <span className="text-muted text-[11px] font-medium">Click to view map &amp; venue</span>
                <span className="text-pink-dark text-xs font-bold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CampDetailModal camp={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </DashboardLayout>
  )
}
