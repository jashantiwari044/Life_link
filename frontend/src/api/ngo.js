import { api } from './client.js'

export const ngoApi = {
  createCamp: (campData, shortageAlertId) =>
    api.post('/ngo/camps', campData, shortageAlertId ? { shortage_alert_id: shortageAlertId } : undefined),
  listMyCamps: () => api.get('/ngo/camps'),
  getCamp: (id) => api.get(`/ngo/camps/${id}`),
  endCamp: (id) => api.patch(`/ngo/camps/${id}/end`),
  removeCamp: (id) => api.delete(`/ngo/camps/${id}`),
  listActiveRequests: (skip, limit) => api.get('/ngo/active-requests', { skip, limit }),
  getRequestDetail: (id) => api.get(`/ngo/active-requests/${id}`),
  respondToRequest: (id) => api.post(`/ngo/active-requests/${id}/respond`),
  getMyResponses: () => api.get('/ngo/my-responses'),
  listShortageAlerts: () => api.get('/ngo/shortage-alerts'),
}

