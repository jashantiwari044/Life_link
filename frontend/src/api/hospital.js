import { api } from './client.js'

export const hospitalApi = {
  createBloodRequest: (requestData) => api.post('/hospital/blood-requests', requestData),
  listBloodRequests: (status) => api.get('/hospital/blood-requests', status ? { status } : undefined),
  getBloodRequest: (id) => api.get(`/hospital/blood-requests/${id}`),
  verifyRequest: (id, approve, rejectionReason) =>
    api.patch(`/hospital/blood-requests/${id}/verify`, { approve, rejection_reason: rejectionReason }),
  confirmReceived: (id) => api.patch(`/hospital/blood-requests/${id}/received`),
  getLinkedBloodBank: () => api.get('/hospital/linked-blood-bank'),
  requestBloodBankLink: (bloodBankId) => api.post('/hospital/blood-bank-link', { blood_bank_id: bloodBankId }),
  listBloodBankLinks: () => api.get('/hospital/blood-bank-links'),
  unlinkBloodBank: () => api.delete('/hospital/blood-bank-link'),
  searchBloodBanks: (query) => api.get('/hospital/approved-blood-banks', query ? { q: query } : undefined),
}
