import { api } from './client.js'

export const bloodBankApi = {
  getRequestDetail: (id) => api.get(`/blood-bank/requests/${id}`),
  getIncomingRequests: (paramsOrPriority, skip, limit) => {
    if (typeof paramsOrPriority === 'object' && paramsOrPriority !== null) {
      return api.get('/blood-bank/incoming-requests', paramsOrPriority)
    }
    return api.get('/blood-bank/incoming-requests', { priority: paramsOrPriority, skip, limit })
  },
  getInventory: () => api.get('/blood-bank/inventory'),
  setInventory: (bloodGroup, unitsAvailable) =>
    api.put(`/blood-bank/inventory/${encodeURIComponent(bloodGroup)}`, { units_available: unitsAvailable }),
  setInventoryBatch: (items) => api.put('/blood-bank/inventory', { items }),
  processFulfillment: (id) => api.patch(`/blood-bank/requests/${id}/fulfill`),
  markDispatched: (id) => api.patch(`/blood-bank/requests/${id}/dispatch`),
  listCommunityResponses: (status) =>
    api.get('/blood-bank/community-responses', status ? { status } : undefined),
  verifyCommunityResponse: (id) => api.patch(`/blood-bank/community-responses/${id}/verify`),
  listLinkRequests: () => api.get('/blood-bank/link-requests'),
  approveRejectLink: (id, approve) => api.patch(`/blood-bank/link-requests/${id}`, { approve }),
  listLinkedHospitals: () => api.get('/blood-bank/linked-hospitals'),
  getDonationLogs: () => api.get('/blood-bank/donation-logs'),
}
