import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import OrgDetailModal from '../../components/OrgDetailModal.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { bloodBankApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

export default function LinkedHospitals() {
  const [hospitals, setHospitals] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [selected, setSelected] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function loadData() {
    const [linked, pending] = await Promise.all([
      bloodBankApi.listLinkedHospitals(),
      bloodBankApi.listLinkRequests(),
    ])
    setHospitals(linked)
    setRequests(pending)
  }

  useEffect(() => {
    loadData()
      .catch((err) => setLoadError(describeError(err, 'Could not load linked hospitals.')))
      .finally(() => setLoading(false))
  }, [])

  async function decide(id, approve) {
    setBusyId(id)
    setActionError('')
    try {
      await bloodBankApi.approveRejectLink(id, approve)
      await loadData()
    } catch (err) {
      setActionError(describeError(err, 'Could not update link request.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DashboardLayout active="Linked Hospitals" links={bloodBankSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Hospital Link Management</h1>
      <p className="text-muted mb-6">Manage hospital connections and link requests for this blood bank.</p>

      <LoadError message={loadError} />
      {actionError && <p className="text-pink-dark text-sm font-semibold mb-4">{actionError}</p>}

      {/* Pending Link Requests */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[19px] font-bold">Pending Link Requests</h2>
          {requests.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fff1d6] text-[#b9770e]">
              {requests.length} Pending
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-muted text-sm bg-white border border-line rounded-xl p-5">
            No pending link requests from hospitals.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 bg-white border border-line rounded-xl px-5 py-4 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-sm text-ink">{req.hospital?.org_name ?? `Hospital #${req.hospital_id}`}</p>
                  {req.hospital && (
                    <p className="text-muted text-[13px] mt-1">
                      {req.hospital.address} · HRF: {req.hospital.registration_number_hrf_id}
                    </p>
                  )}
                  <p className="text-muted text-[12px] mt-1">
                    Requested on {req.updated_at ? formatDate(req.updated_at) : 'recently'}
                  </p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {req.hospital && (
                    <button
                      type="button"
                      onClick={() => setSelected(req.hospital)}
                      className="inline-flex items-center justify-center rounded-full font-semibold bg-white text-ink border border-line px-4 py-2 text-[13px] transition-transform duration-150 hover:-translate-y-px"
                    >
                      View Details
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => decide(req.id, true)}
                    className="inline-flex items-center justify-center rounded-full font-semibold bg-pink text-white px-5 py-2 text-[13px] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-50"
                  >
                    {busyId === req.id ? 'Connecting…' : 'Approve & Connect'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => decide(req.id, false)}
                    className="inline-flex items-center justify-center rounded-full font-semibold bg-white text-ink border border-line px-4 py-2 text-[13px] transition-transform duration-150 hover:-translate-y-px disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Connected Hospitals */}
      <section>
        <h2 className="text-[19px] font-bold mb-4">Connected Hospitals</h2>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : hospitals.length === 0 ? (
          <p className="text-muted text-sm bg-white border border-line rounded-xl p-5">
            No hospitals connected yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="flex items-center gap-4 bg-white border border-line rounded-xl px-5 py-4 flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-ink">{hospital.org_name}</p>
                    <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d]">
                      Connected
                    </span>
                  </div>
                  <p className="text-muted text-[13px] mt-1">
                    {hospital.address} · HRF: {hospital.registration_number_hrf_id}
                  </p>
                  <p className="text-muted text-[13px]">
                    POC: {hospital.poc_name} ({hospital.poc_contact})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(hospital)}
                  className="inline-flex items-center justify-center rounded-full font-semibold bg-white text-ink border border-line px-5 py-2 text-[13px] transition-transform duration-150 hover:-translate-y-px"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <OrgDetailModal org={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </DashboardLayout>
  )
}
