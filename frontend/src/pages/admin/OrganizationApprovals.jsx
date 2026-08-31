import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import LoadError from '../../components/LoadError.jsx'
import OrgDetailModal from '../../components/OrgDetailModal.jsx'
import ConfirmModal from '../../components/ConfirmModal.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { adminApi, describeError } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

export default function OrganizationApprovals() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [decisions, setDecisions] = useState({})
  const [selected, setSelected] = useState(null)
  // Quick approve from the row still asks for confirmation; rejection always
  // goes through the detail modal so a reason can be captured.
  const [pendingApproval, setPendingApproval] = useState(null)

  useEffect(() => {
    adminApi
      .getOrgApprovals()
      .then(setOrgs)
      .catch((err) => setLoadError(describeError(err, 'Could not load pending organizations.')))
      .finally(() => setLoading(false))
  }, [])

  async function decide(id, approve, rejectionReason) {
    await adminApi.approveRejectOrg(id, approve, rejectionReason)
    setDecisions((d) => ({ ...d, [id]: approve ? 'approved' : 'rejected' }))
    setSelected(null)
    setPendingApproval(null)
  }

  return (
    <DashboardLayout active="Org Approvals" links={adminSidebarLinks}>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
          Organization Approvals
        </h1>
        <p className="text-muted text-sm">Review registration applications from hospitals, blood banks, and NGOs.</p>
      </div>

      <LoadError message={loadError} />

      {loading ? (
        <p className="text-muted py-8">Loading applications…</p>
      ) : orgs.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-10 text-center shadow-xs">
          <p className="text-muted text-sm">No pending organization registration requests at this time.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {orgs.map((org) => {
            const decision = decisions[org.id]
            return (
              <div
                key={org.id}
                className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-pink-light text-pink-dark flex items-center justify-center font-bold text-xs shrink-0">
                    {org.org_type === 'HOSPITAL' ? '🏥' : org.org_type === 'BLOOD_BANK' ? '🧪' : '🤝'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-ink text-sm sm:text-base">{org.org_name}</p>
                    <p className="text-muted text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700">{org.org_type}</span>
                      <span>·</span>
                      <span>HRF #{org.registration_number_hrf_id}</span>
                      <span>·</span>
                      <span>Submitted {formatDate(org.created_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end flex-wrap">
                  {decision ? (
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        decision === 'approved'
                          ? 'bg-[#e3f5e8] text-[#1f8a3d] border border-green-200'
                          : 'bg-[#ffe1e1] text-[#d5233f] border border-red-200'
                      }`}
                    >
                      {decision === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  ) : org.approval_status === 'REJECTED' ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ffe1e1] text-[#d5233f] border border-red-200">
                        Rejected
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingApproval(org)}
                        className="inline-flex items-center justify-center rounded-full font-bold bg-white text-ink border border-line px-4 py-1.5 text-xs shadow-xs hover:border-pink hover:text-pink-dark transition-all cursor-pointer"
                      >
                        Re-Approve
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelected(org)}
                        className="inline-flex items-center justify-center rounded-full font-bold bg-white text-ink border border-line px-4 py-1.5 text-xs shadow-xs hover:border-pink hover:text-pink-dark transition-all cursor-pointer"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingApproval(org)}
                        className="inline-flex items-center justify-center rounded-full font-bold bg-pink text-white px-4 py-1.5 text-xs shadow-xs hover:bg-pink-dark transition-all cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <OrgDetailModal
        org={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        onDecision={decide}
      />

      <ConfirmModal
        open={pendingApproval !== null}
        title="Approve this organization?"
        message={
          pendingApproval
            ? `${pendingApproval.org_name} (${pendingApproval.org_type}) will be able to sign in and operate on the platform immediately.`
            : ''
        }
        confirmLabel="Yes, Approve"
        tone="primary"
        onConfirm={() => decide(pendingApproval.id, true)}
        onCancel={() => setPendingApproval(null)}
      />
    </DashboardLayout>
  )
}
