import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Clock,
  Droplet,
  Phone,
  MapPin,
  AlertCircle,
} from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import OrgDetailModal from '../../components/OrgDetailModal.jsx'
import { bloodBankSidebarLinks } from '../../config/sidebarLinks.js'
import { orgsApi, bloodBankApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const urgencyBadge = {
  EMERGENCY: 'bg-[#ffe1e1] text-[#d5233f] border border-red-200',
  URGENT: 'bg-[#fff1d6] text-[#b9770e] border border-amber-200',
  PLANNED: 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200',
}

export default function BloodBankDashboard() {
  const [org, setOrg] = useState(null)
  const [incoming, setIncoming] = useState([])
  const [linkedHospitals, setLinkedHospitals] = useState([])
  const [linkRequests, setLinkRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [busyLinkId, setBusyLinkId] = useState(null)

  async function loadData() {
    const [orgData, requests, hospitals, requestsPending] = await Promise.all([
      orgsApi.getMe(),
      bloodBankApi.getIncomingRequests(),
      bloodBankApi.listLinkedHospitals(),
      bloodBankApi.listLinkRequests(),
    ])
    setOrg(orgData)
    setIncoming(requests)
    setLinkedHospitals(hospitals)
    setLinkRequests(requestsPending)
  }

  useEffect(() => {
    loadData()
      .catch((err) => setLoadError(describeError(err, 'Could not load the dashboard.')))
      .finally(() => setLoading(false))
  }, [])

  async function handleLinkDecision(id, approve) {
    setBusyLinkId(id)
    setActionError('')
    try {
      await bloodBankApi.approveRejectLink(id, approve)
      await loadData()
    } catch (err) {
      setActionError(describeError(err, 'Could not update link request.'))
    } finally {
      setBusyLinkId(null)
    }
  }

  if (loading || loadError) {
    return (
      <DashboardLayout active="Dashboard" links={bloodBankSidebarLinks}>
        <LoadError message={loadError} />
        {loading && <p className="text-muted py-8">Loading blood bank dashboard…</p>}
      </DashboardLayout>
    )
  }

  const actionable = incoming.filter((r) => r.status === 'VERIFIED' || r.status === 'READY_FOR_DISPATCH')

  return (
    <DashboardLayout active="Dashboard" links={bloodBankSidebarLinks} user={{ name: org.org_name }}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Welcome, {org.org_name} 👋
        </h1>
        <p className="text-muted text-sm">Blood bank inventory, linked hospital networks, and fulfillment hub.</p>
      </div>

      <LoadError message={loadError} />
      {actionError && <p className="text-pink-dark text-sm font-semibold mb-4">{actionError}</p>}

      {/* KPI Cards */}
      <div className="flex gap-4 flex-wrap mb-8">
        <div className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Awaiting Your Action</p>
          <p className="text-2xl font-extrabold text-pink-dark">{actionable.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Pending Link Requests</p>
          <p className="text-2xl font-extrabold text-[#b9770e]">{linkRequests.length}</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-5 w-[220px] shadow-xs">
          <p className="text-muted text-xs mb-1 font-semibold">Connected Hospitals</p>
          <p className="text-2xl font-extrabold text-[#1f8a3d]">{linkedHospitals.length}</p>
        </div>
      </div>

      {/* Connected Hospital Section */}
      <section className="mb-10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-ink">Connected Hospitals</h2>
        {linkedHospitals.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-muted text-sm shadow-xs">
            No hospital connected yet. Hospitals can send link requests to collaborate with your blood bank.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {linkedHospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="flex items-center gap-4 bg-white border border-line rounded-2xl p-5 shadow-xs flex-wrap transition-all hover:border-slate-300"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-sm shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-ink">{hospital.org_name}</p>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e3f5e8] text-[#1f8a3d] border border-green-200">
                      Connected
                    </span>
                  </div>
                  <p className="text-muted text-xs mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-pink-dark shrink-0" />
                    <span>{hospital.address} · HRF: {hospital.registration_number_hrf_id}</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>POC: {hospital.poc_name} ({hospital.poc_contact})</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHospital(hospital)}
                  className="inline-flex items-center justify-center rounded-full font-bold bg-white text-ink border border-line px-5 py-2 text-xs transition-all hover:border-pink hover:text-pink-dark"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending Hospital Link Requests Section */}
      {linkRequests.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-ink">Hospital Link Requests</h2>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#fff1d6] text-[#b9770e] border border-amber-200">
              {linkRequests.length} Pending
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {linkRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-4 bg-white border border-line rounded-2xl p-5 shadow-xs flex-wrap"
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-sm text-ink">{req.hospital?.org_name ?? `Hospital #${req.hospital_id}`}</p>
                  {req.hospital && (
                    <p className="text-muted text-xs mt-1">
                      {req.hospital.address} · HRF: {req.hospital.registration_number_hrf_id}
                    </p>
                  )}
                  <p className="text-muted text-[11px] mt-1">
                    Requested on {req.updated_at ? formatDate(req.updated_at) : 'recently'}
                  </p>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {req.hospital && (
                    <button
                      type="button"
                      onClick={() => setSelectedHospital(req.hospital)}
                      className="inline-flex items-center justify-center rounded-full font-bold bg-white text-ink border border-line px-4 py-2 text-xs transition-all hover:border-pink hover:text-pink-dark"
                    >
                      View Details
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyLinkId === req.id}
                    onClick={() => handleLinkDecision(req.id, true)}
                    className="inline-flex items-center justify-center rounded-full font-bold bg-pink text-white px-5 py-2 text-xs transition-all hover:bg-pink-dark shadow-xs disabled:opacity-50"
                  >
                    {busyLinkId === req.id ? 'Connecting…' : 'Approve & Connect'}
                  </button>
                  <button
                    type="button"
                    disabled={busyLinkId === req.id}
                    onClick={() => handleLinkDecision(req.id, false)}
                    className="inline-flex items-center justify-center rounded-full font-bold bg-white text-ink border border-line px-4 py-2 text-xs transition-all hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Incoming Requests Section */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-ink">Incoming Patient Requests</h2>
          <Link to="/bloodbank/requests" className="text-pink-dark text-xs font-bold hover:underline inline-flex items-center gap-1">
            <span>View All ({incoming.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {incoming.length === 0 ? (
          <div className="bg-white border border-line rounded-2xl p-6 text-center text-muted text-sm shadow-xs">
            No incoming requests right now.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-line rounded-2xl shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-muted text-xs uppercase tracking-[0.4px]">
                  <th className="text-left px-5 py-3.5">Hospital</th>
                  <th className="text-left px-5 py-3.5">Blood</th>
                  <th className="text-left px-5 py-3.5">Units</th>
                  <th className="text-left px-5 py-3.5">Urgency</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-left px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((req) => (
                  <tr key={req.id} className="border-b border-line last:border-b-0 hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-ink">{req.hospital?.org_name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-light text-pink-dark border border-pink/20">
                        {req.blood_group_required}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">{req.units_required} unit(s)</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${urgencyBadge[req.priority]}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/bloodbank/requests/tracking?id=${req.id}`}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold bg-pink text-white shadow-xs hover:bg-pink-dark transition-all"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Hospital details modal */}
      <OrgDetailModal
        org={selectedHospital}
        open={selectedHospital !== null}
        onClose={() => setSelectedHospital(null)}
      />
    </DashboardLayout>
  )
}
