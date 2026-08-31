import { api } from './client.js'

export const adminApi = {
  getOrgApprovals: () => api.get('/admin/org-approvals'),
  getActiveOrganizations: () => api.get('/admin/organizations'),
  approveRejectOrg: (id, approve, rejectionReason) =>
    api.patch(`/admin/org-approvals/${id}`, { approve, rejection_reason: rejectionReason }),
  revokeOrg: (id) => api.patch(`/admin/organizations/${id}/revoke`),
  listUsers: (skip, limit) => api.get('/admin/users', { skip, limit }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
  getAnalytics: () => api.get('/admin/analytics'),
}
