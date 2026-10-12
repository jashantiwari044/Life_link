import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Building2, Phone, MapPin, Send, Trash2, Search, Link2 } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LocationView from '../../components/LocationView.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, ApiError } from '../../api/index.js'
import { labelClass, inputClass } from '../../constants/formStyles.js'

function apiMessage(err, fallback) {
  return err instanceof ApiError ? err.detail?.detail ?? err.message : fallback
}

export default function LinkedBloodBank() {
  const [linkedBanks, setLinkedBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [allBloodBanks, setAllBloodBanks] = useState([])
  const [links, setLinks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [requestedId, setRequestedId] = useState(null)
  const [error, setError] = useState('')
  const [submittingId, setSubmittingId] = useState(null)
  const [bankToUnlink, setBankToUnlink] = useState(null)

  const load = useCallback(() => {
    return Promise.all([
      hospitalApi.getLinkedBloodBanks().catch(() => []),
      hospitalApi.searchBloodBanks().catch(() => []),
      hospitalApi.listBloodBankLinks().catch(() => []),
    ])
      .then(([banks, allBanks, linkRows]) => {
        setLinkedBanks(Array.isArray(banks) ? banks : [])
        setAllBloodBanks(Array.isArray(allBanks) ? allBanks : [])
        setLinks(Array.isArray(linkRows) ? linkRows : [])
      })
      .catch(() => setError('Could not load blood banks.'))
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function handleSendRequest(bankId) {
    setError('')
    setSubmittingId(bankId)
    setRequestedId(null)
    try {
      await hospitalApi.requestBloodBankLink(bankId)
      setRequestedId(bankId)
      await load()
    } catch (err) {
      setError(apiMessage(err, 'Could not send link request.'))
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleUnlink() {
    if (!bankToUnlink) return
    setError('')
    try {
      await hospitalApi.unlinkBloodBank(bankToUnlink.id)
      setRequestedId(null)
      await load()
    } catch (err) {
      setError(apiMessage(err, 'Could not unlink blood bank.'))
    } finally {
      setBankToUnlink(null)
    }
  }

  const statusByBank = links.reduce((acc, link) => ({ ...acc, [link.blood_bank_id]: link.status }), {})

  const filteredBanks = allBloodBanks.filter((bank) =>
    bank.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bank.address && bank.address.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  function bankButtonLabel(bank) {
    if (submittingId === bank.id) return 'Sending…'
    const status = statusByBank[bank.id]
    if (status === 'APPROVED') return 'Connected'
    if (status === 'PENDING') return 'Request Pending'
    if (status === 'REJECTED') return 'Request Again'
    return 'Connect'
  }

  function bankButtonDisabled(bank) {
    const status = statusByBank[bank.id]
    return submittingId !== null || status === 'APPROVED' || status === 'PENDING'
  }

  return (
    <DashboardLayout active="Connected Blood Banks" links={hospitalSidebarLinks}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Connected Blood Banks
        </h1>
        <p className="text-muted text-sm">
          Manage your hospital's blood bank network. Connect with multiple blood banks to request blood units directly during emergencies.
        </p>
      </div>

      {error && (
        <div className="bg-[#ffe1e1] border border-red-200 text-[#d5233f] text-xs font-semibold rounded-xl p-3 mb-6">
          {error}
        </div>
      )}

      {/* Connected Blood Banks List */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Building2 className="w-5 h-5 text-pink" />
            <span>Active Connections ({linkedBanks.length})</span>
          </h2>
        </div>

        {loading ? (
          <p className="text-muted text-sm py-4">Loading connected blood banks…</p>
        ) : linkedBanks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkedBanks.map((bank) => (
              <div key={bank.id} className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-ink">{bank.org_name}</h3>
                      <p className="text-xs text-muted mt-0.5">HRF ID: {bank.registration_number_hrf_id}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e3f5e8] text-[#1f8a3d] shrink-0">
                      Active Partner
                    </span>
                  </div>

                  <div className="text-xs text-muted flex flex-col gap-1.5 my-3">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{bank.poc_name} · {bank.poc_contact}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{bank.address}</span>
                    </p>
                  </div>

                  {(bank.latitude != null || bank.address) && (
                    <LocationView
                      className="mt-3"
                      label="Location Map"
                      address={bank.address}
                      latitude={bank.latitude}
                      longitude={bank.longitude}
                      height={140}
                    />
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setBankToUnlink(bank)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#d5233f] hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-ink mb-1">No Blood Banks Connected Yet</p>
            <p className="text-xs text-muted max-w-md mx-auto">
              Search and send connection requests to blood banks below. Once they approve, you can forward emergency blood requests directly to them.
            </p>
          </div>
        )}
      </section>

      {/* Search & Connect New Blood Banks */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Link2 className="w-5 h-5 text-pink" />
            <span>Find & Connect Additional Blood Banks</span>
          </h2>
          <p className="text-muted text-xs">Send connection requests to verified regional blood banks</p>
        </div>

        <div className="bg-white border border-line rounded-2xl p-6 shadow-xs max-w-3xl flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="searchQuery" className={labelClass}>Search by Blood Bank Name or City</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                id="searchQuery"
                type="text"
                placeholder="Search approved blood banks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-10 border-line w-full`}
              />
            </div>
          </div>

          {requestedId && (
            <div className="text-xs font-semibold text-[#1f8a3d] bg-[#e3f5e8] border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Connection request sent successfully! Waiting for blood bank approval.</span>
            </div>
          )}

          <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredBanks.length > 0 ? (
              filteredBanks.map((bank) => {
                const isLinked = statusByBank[bank.id] === 'APPROVED'
                const isPending = statusByBank[bank.id] === 'PENDING'
                return (
                  <div key={bank.id} className="border border-line rounded-xl p-4 flex items-center justify-between gap-4 bg-white hover:border-slate-300 transition-all">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-ink">{bank.org_name}</h4>
                        <span className="text-[11px] text-muted">({bank.registration_number_hrf_id})</span>
                      </div>
                      <p className="text-muted text-xs mt-1 truncate">{bank.address}</p>
                      <p className="text-muted text-xs mt-0.5">{bank.poc_name} · {bank.poc_contact}</p>
                    </div>

                    <button
                      type="button"
                      disabled={bankButtonDisabled(bank)}
                      onClick={() => handleSendRequest(bank.id)}
                      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold shrink-0 transition-all ${
                        isLinked
                          ? 'bg-[#e3f5e8] text-[#1f8a3d] cursor-default'
                          : isPending
                          ? 'bg-amber-100 text-amber-800 cursor-default'
                          : 'bg-pink text-white hover:bg-pink-dark'
                      }`}
                    >
                      {bankButtonLabel(bank)}
                    </button>
                  </div>
                )
              })
            ) : (
              <p className="text-muted text-xs py-4 text-center">No matching approved blood banks found.</p>
            )}
          </div>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(bankToUnlink)}
        title="Disconnect Blood Bank?"
        message={
          bankToUnlink
            ? `Are you sure you want to end your association with ${bankToUnlink.org_name}? Requests currently being fulfilled must be resolved first.`
            : ''
        }
        confirmLabel="Yes, Disconnect"
        onConfirm={handleUnlink}
        onCancel={() => setBankToUnlink(null)}
      />
    </DashboardLayout>
  )
}
