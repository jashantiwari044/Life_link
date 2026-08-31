import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Phone,
  CheckCircle2,
  Plus,
  X,
  ArrowRight,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { ngoSidebarLinks } from '../../config/sidebarLinks.js'
import CampDetailModal from '../../components/CampDetailModal.jsx'
import { ngoApi, describeError } from '../../api/index.js'
import { btnPrimary } from '../../constants/buttonStyles.js'
import { formatDate } from '../../utils/dates.js'

export default function NgoDonationDrives() {
  const [drives, setDrives] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirmingEnd, setConfirmingEnd] = useState(null)
  const [tab, setTab] = useState('ALL')
  const [successMsg, setSuccessMsg] = useState('')

  async function loadData() {
    const data = await ngoApi.listMyCamps()
    setDrives(data || [])
  }

  useEffect(() => {
    loadData()
      .catch((err) => setLoadError(describeError(err, 'Could not load your drives.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleEndCamp(camp) {
    setSuccessMsg('')
    try {
      await ngoApi.endCamp(camp.id)
      setConfirmingEnd(null)
      await loadData()
      setSuccessMsg(`Donation drive "${camp.title}" has been ended and marked as Completed!`)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setLoadError(describeError(err, 'Could not end this donation drive.'))
    }
  }

  const filteredDrives = useMemo(() => {
    if (tab === 'ACTIVE') return drives.filter((d) => d.status !== 'COMPLETED')
    if (tab === 'COMPLETED') return drives.filter((d) => d.status === 'COMPLETED')
    return drives
  }, [drives, tab])

  const counts = useMemo(() => {
    const active = drives.filter((d) => d.status !== 'COMPLETED').length
    const completed = drives.filter((d) => d.status === 'COMPLETED').length
    return { active, completed, total: drives.length }
  }, [drives])

  return (
    <DashboardLayout active="Donation Drives" links={ngoSidebarLinks}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Donation Drives</h1>
          <p className="text-muted text-sm">Manage blood donation camps organized by your NGO.</p>
        </div>
        <Link to="/ngo/drives/publish" className={btnPrimary}>
          <Plus className="w-4 h-4" />
          <span>Create Drive</span>
        </Link>
      </div>

      <LoadError message={loadError} />

      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-[#e3f5e8] border border-[#86efac] text-[#1f8a3d] text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#1f8a3d] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="p-1 rounded-lg hover:bg-green-100 transition-colors">
            <X className="w-4 h-4 text-[#1f8a3d]" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'ALL', label: `All Drives (${counts.total})` },
          { id: 'ACTIVE', label: `Active / Ongoing (${counts.active})` },
          { id: 'COMPLETED', label: `Completed (${counts.completed})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              tab === t.id
                ? 'bg-ink text-white shadow-xs'
                : 'bg-white text-muted border border-line hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted py-8">Loading drives…</p>
      ) : filteredDrives.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center text-muted text-sm shadow-xs">
          No donation drives found for this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrives.map((drive) => {
            const isCompleted = drive.status === 'COMPLETED'
            return (
              <div
                key={drive.id}
                className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                        isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200'
                      }`}
                    >
                      {!isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-[#1f8a3d]" />}
                      <span>{isCompleted ? 'Completed' : 'Active'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelected(drive)}
                      className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold mb-2.5 text-ink line-clamp-2">{drive.title}</h3>
                  <p className="text-muted text-xs mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                    <span>{formatDate(drive.date_time)}</span>
                  </p>
                  <p className="text-muted text-xs mb-2 flex items-center gap-1.5 line-clamp-2">
                    <MapPin className="w-3.5 h-3.5 text-pink-dark shrink-0" />
                    <span>{drive.venue}</span>
                  </p>
                  {drive.contact_info && (
                    <p className="text-slate-500 text-xs flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{drive.contact_info}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  {!isCompleted ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingEnd(drive)}
                      className="w-full text-center py-2 rounded-full text-xs font-bold bg-white text-[#d5233f] border border-[#d5233f] transition-all hover:bg-red-50"
                    >
                      End Drive
                    </button>
                  ) : (
                    <span className="text-xs text-muted font-medium w-full text-center py-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ended / Completed</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CampDetailModal camp={selected} open={selected !== null} onClose={() => setSelected(null)} />

      <ConfirmModal
        open={confirmingEnd !== null}
        title="End Donation Drive?"
        tone="danger"
        confirmLabel="Yes, End Drive"
        message={
          confirmingEnd
            ? `Are you sure you want to end "${confirmingEnd.title}"? This drive will be marked as Completed and will no longer appear on public user dashboards.`
            : ''
        }
        onConfirm={() => handleEndCamp(confirmingEnd)}
        onCancel={() => setConfirmingEnd(null)}
      />
    </DashboardLayout>
  )
}
