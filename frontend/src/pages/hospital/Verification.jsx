import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { hospitalSidebarLinks } from '../../config/sidebarLinks.js'
import { orgsApi } from '../../api/index.js'
import { formatDate } from '../../utils/dates.js'

const statusBadge = {
  APPROVED: 'bg-[#e3f5e8] text-[#1f8a3d]',
  PENDING: 'bg-[#fff1d6] text-[#b9770e]',
  REJECTED: 'bg-[#ffe1e1] text-[#d5233f]',
}

export default function HospitalVerification() {
  const [org, setOrg] = useState(null)

  useEffect(() => {
    orgsApi.getMe().then(setOrg)
  }, [])

  if (!org) {
    return (
      <DashboardLayout active="Verification" links={hospitalSidebarLinks}>
        <p className="text-muted">Loading…</p>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout active="Verification" links={hospitalSidebarLinks} user={{ name: org.org_name }}>
      <h1 className="text-[26px] font-extrabold mb-[6px]">Hospital Verification</h1>
      <p className="text-muted mb-6">Registration and approval status.</p>

      <div className="bg-white border border-line rounded-[14px] p-8 max-w-[560px] mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[19px] font-bold">{org.org_name}</h2>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadge[org.approval_status] ?? 'bg-line text-muted'}`}>
            {org.approval_status}
          </span>
        </div>
        <p className="text-muted text-[13px]">Reg. No. {org.registration_number_hrf_id}</p>
        <p className="text-muted text-[13px] mt-1">Registered on {formatDate(org.created_at)}</p>
        {org.supporting_docs_url && (
          <p className="text-muted text-[13px] mt-1">
            Supporting docs:{' '}
            <a href={org.supporting_docs_url} target="_blank" rel="noreferrer" className="text-pink-dark font-semibold">
              View
            </a>
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}
