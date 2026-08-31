import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LocationView from '../../components/LocationView.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { hospitalApi, ApiError } from '../../api/index.js'
import { labelClass, inputClass } from '../../constants/formStyles.js'

const linkBtn =
  'inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold bg-pink text-white shadow-[0_4px_10px_rgba(242,70,125,0.2)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-50'

function apiMessage(err, fallback) {
  return err instanceof ApiError ? err.detail?.detail ?? err.message : fallback
}

export default function LinkedBloodBank() {
  const [linkedBank, setLinkedBank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allBloodBanks, setAllBloodBanks] = useState([])
  const [links, setLinks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [requested, setRequested] = useState(null)
  const [error, setError] = useState('')
  const [submittingId, setSubmittingId] = useState(null)
  const [confirmingUnlink, setConfirmingUnlink] = useState(false)

  const load = useCallback(() => {
    return Promise.all([
      hospitalApi.getLinkedBloodBank(),
      hospitalApi.searchBloodBanks(),
      hospitalApi.listBloodBankLinks(),
    ])
      .then(([bank, banks, linkRows]) => {
        setLinkedBank(bank)
        setAllBloodBanks(banks || [])
        setLinks(linkRows || [])
      })
      .catch(() => setError('Could not load blood banks.'))
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function handleSendRequest(bankId) {
    setError('')
    setSubmittingId(bankId)
    setRequested(null)
    try {
      await hospitalApi.requestBloodBankLink(bankId)
      setRequested(bankId)
      await load()
    } catch (err) {
      setError(apiMessage(err, 'Could not send link request.'))
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleUnlink() {
    await hospitalApi.unlinkBloodBank()
    setRequested(null)
    setError('')
    await load()
    setConfirmingUnlink(false)
  }

  // Link status keyed by blood bank so each card can label itself correctly.
  const statusByBank = links.reduce((acc, link) => ({ ...acc, [link.blood_bank_id]: link.status }), {})

  const filteredBanks = allBloodBanks.filter((bank) =>
    bank.org_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  function bankButtonLabel(bank) {
    if (submittingId === bank.id) return 'Sending…'
    const status = statusByBank[bank.id]
    if (status === 'APPROVED') return 'Linked'
    if (status === 'PENDING') return 'Request Pending'
    if (status === 'REJECTED') return 'Request Again'
    return 'Send Link Request'
  }

  function bankButtonDisabled(bank) {
    const status = statusByBank[bank.id]
    return submittingId !== null || status === 'APPROVED' || status === 'PENDING'
  }

  return (
    <DashboardLayout active="Linked Blood Bank" links={hospitalSidebarLinks}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Linked Blood Bank</h1>
      <p className="text-muted mb-6">
        A hospital works with one blood bank at a time. Unlink the current one before switching.
      </p>

      <section className="mb-10">
        <h2 className="text-[19px] font-bold mb-4">Connected</h2>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : linkedBank ? (
          <div className="bg-white border border-line rounded-xl px-5 py-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-bold">{linkedBank.org_name}</p>
                <p className="text-muted text-xs">
                  {linkedBank.poc_name} · {linkedBank.poc_contact}
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e3f5e8] text-[#1f8a3d]">Connected</span>
              <button
                type="button"
                onClick={() => setConfirmingUnlink(true)}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold bg-white text-[#d5233f] border border-[#d5233f] transition-transform duration-150 hover:-translate-y-px"
              >
                Unlink
              </button>
            </div>

            {(linkedBank.latitude != null || linkedBank.address) && (
              <LocationView
                className="mt-4"
                label="Where to find them"
                address={linkedBank.address}
                latitude={linkedBank.latitude}
                longitude={linkedBank.longitude}
                height={180}
              />
            )}
          </div>
        ) : (
          <p className="text-muted text-sm">No blood bank linked yet.</p>
        )}
      </section>

      {/* The search section only exists while the hospital is free to link. */}
      {!loading && !linkedBank && (
        <section>
          <h2 className="text-[19px] font-bold mb-4">Link a New Blood Bank</h2>
          <div className="bg-white border border-line rounded-[14px] p-8 max-w-[560px] flex flex-col gap-6">
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="searchQuery" className={labelClass}>Search Blood Bank</label>
              <input
                id="searchQuery"
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} border-line w-full`}
              />
            </div>

            {error && <p className="text-pink-dark text-xs font-semibold">{error}</p>}
            {requested && (
              <p className="text-sm font-semibold text-[#1f8a3d] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Link request sent. It stays pending until the blood bank approves it.</span>
              </p>
            )}

            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2">
              {filteredBanks.length > 0 ? (
                filteredBanks.map((bank) => (
                  <div key={bank.id} className="border border-line rounded-[10px] p-4 flex flex-col gap-2 bg-white">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-sm text-ink">{bank.org_name}</h3>
                        <p className="text-muted text-xs mt-1">HRF ID: {bank.registration_number_hrf_id}</p>
                        <p className="text-muted text-xs mt-1">{bank.address}</p>
                        <p className="text-muted text-xs">{bank.poc_name} · {bank.poc_contact}</p>
                      </div>
                      <button
                        type="button"
                        disabled={bankButtonDisabled(bank)}
                        onClick={() => handleSendRequest(bank.id)}
                        className={linkBtn}
                      >
                        {bankButtonLabel(bank)}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted text-xs py-2">No matching approved blood banks found.</p>
              )}
            </div>
          </div>
        </section>
      )}

      {!loading && linkedBank && error && <p className="text-pink-dark text-xs font-semibold">{error}</p>}

      <ConfirmModal
        open={confirmingUnlink}
        title="Unlink this blood bank?"
        message={
          linkedBank
            ? `${linkedBank.org_name} will stop receiving verified requests from this hospital. You will not be able to verify new requests until another blood bank is linked.`
            : ''
        }
        confirmLabel="Yes, Unlink"
        onConfirm={handleUnlink}
        onCancel={() => setConfirmingUnlink(false)}
      />
    </DashboardLayout>
  )
}
