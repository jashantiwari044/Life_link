import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Truck } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, ApiError } from '../../api/index.js'
import { btnPrimary } from '../../constants/buttonStyles.js'

export default function ConfirmBloodReceived() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    hospitalApi.getBloodRequest(id).then((data) => {
      setRequest(data)
      setConfirmed(data.status === 'BLOOD_RECEIVED')
      setLoading(false)
    })
  }, [id])

  async function handleConfirm() {
    setError('')
    try {
      const updated = await hospitalApi.confirmReceived(id)
      setRequest(updated)
      setConfirmed(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail?.detail ?? err.message : 'Could not confirm receipt.')
    }
  }

  return (
    <DashboardLayout active="All Requests" links={hospitalSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">Confirm Blood Received</h1>
      <p className="text-muted text-sm mb-6">
        Confirm once the requested blood units have arrived at the hospital.
      </p>

      {loading ? (
        <p className="text-muted py-8">Loading…</p>
      ) : !request ? (
        <div className="bg-white border border-line rounded-2xl p-6 text-muted text-sm shadow-xs max-w-[560px]">
          Open this page from a request's Review screen to confirm receipt.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl p-6 sm:p-8 max-w-[560px] shadow-xs">
          <h2 className="text-lg font-bold text-ink mb-6">{request.patient_name}</h2>

          <dl className="flex flex-col gap-3 mb-6">
            <div className="flex justify-between text-sm py-1.5 border-b border-line">
              <dt className="text-muted text-xs">Blood Group</dt>
              <dd className="font-extrabold text-xs text-pink-dark">{request.blood_group_required}</dd>
            </div>
            <div className="flex justify-between text-sm py-1.5 border-b border-line">
              <dt className="text-muted text-xs">Units Required</dt>
              <dd className="font-semibold text-xs text-ink">{request.units_required} unit(s)</dd>
            </div>
            <div className="flex justify-between text-sm py-1.5">
              <dt className="text-muted text-xs">Status</dt>
              <dd className="font-semibold text-xs text-ink">{request.status}</dd>
            </div>
          </dl>

          {error && <p className="text-pink-dark text-xs font-semibold mb-4">{error}</p>}

          {confirmed ? (
            <div className="p-4 bg-[#e3f5e8] border border-[#86efac] rounded-2xl flex items-center gap-2.5 text-[#1f8a3d] text-sm font-bold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Blood received and logged for {request.patient_name}.</span>
            </div>
          ) : request.status === 'DISPATCHED' ? (
            <button type="button" className={btnPrimary} onClick={handleConfirm}>
              Confirm Received
            </button>
          ) : (
            <p className="text-xs text-muted font-medium flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Blood has not been dispatched by the blood bank yet — check back once it's on its way.</span>
            </p>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
