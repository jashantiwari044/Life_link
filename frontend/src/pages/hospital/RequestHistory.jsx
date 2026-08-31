import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'
import { hospitalStage, statusBadgeClass, TONE_TEXT } from '../../constants/requestStatus.js'

export default function HospitalRequestHistory() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    hospitalApi
      .listBloodRequests()
      .then(setRequests)
      .catch((err) => setLoadError(describeError(err, 'Could not load request history.')))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardLayout active="Request History" links={hospitalSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Request History</h1>
      <p className="text-muted mb-6">All blood requests raised by this hospital.</p>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted text-sm">No requests yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req) => {
            const stage = hospitalStage(req)
            return (
              <div key={req.id} className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-sm font-bold">
                      {req.patient_name} · {req.blood_group_required} × {req.units_required}
                    </p>
                    <p className="text-muted text-xs mt-1">
                      Raised {formatDate(req.created_at)}
                      {req.assigned_blood_bank?.org_name ? ` · ${req.assigned_blood_bank.org_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-line text-muted">
                    {stage.label}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadgeClass(req.status)}`}>
                    {req.status}
                  </span>
                </div>
                {stage.detail && (
                  <p className={`text-[13px] font-semibold mt-3 pt-3 border-t border-line ${TONE_TEXT[stage.tone]}`}>
                    {stage.detail}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
