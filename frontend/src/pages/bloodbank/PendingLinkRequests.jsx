import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'
import { formatDate as formatDateUtc } from '../../utils/dates.js'

function formatDate(iso) {
  return iso ? formatDateUtc(iso) : '—'
}

export default function PendingLinkRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busyId, setBusyId] = useState(null)

  async function refresh() {
    const data = await bloodBankApi.listLinkRequests()
    setRequests(data)
  }

  useEffect(() => {
    refresh()
      .catch((err) => setLoadError(describeError(err, 'Could not load pending link requests.')))
      .finally(() => setLoading(false))
  }, [])

  async function decide(id, approve) {
    setBusyId(id)
    try {
      await bloodBankApi.approveRejectLink(id, approve)
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout active="Linked Hospitals" links={bloodBankSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Pending Link Requests</h1>
      <p className="text-muted mb-6">Hospitals requesting to connect with this blood bank.</p>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted text-sm">No pending link requests.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-4 bg-white border border-line rounded-xl px-5 py-4 flex-wrap"
            >
              <div className="flex-1 text-sm">
                <p className="font-bold">{req.hospital?.org_name ?? `Hospital #${req.hospital_id}`}</p>
                {req.hospital && (
                  <p className="text-muted text-[13px] mt-1">
                    {req.hospital.address} · HRF {req.hospital.registration_number_hrf_id}
                  </p>
                )}
                <p className="text-muted text-[13px] mt-1">Requested {formatDate(req.updated_at)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === req.id}
                  onClick={() => decide(req.id, true)}
                  className="inline-flex items-center justify-center rounded-full font-semibold bg-pink text-white px-5 py-2 text-[13px] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === req.id}
                  onClick={() => decide(req.id, false)}
                  className="inline-flex items-center justify-center rounded-full font-semibold bg-white text-ink border border-line px-5 py-2 text-[13px] transition-transform duration-150 hover:-translate-y-px disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
