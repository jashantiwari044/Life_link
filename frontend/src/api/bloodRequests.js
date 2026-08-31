import { api } from './client.js'

export const bloodRequestsApi = {
  create: (requestData) => api.post('/blood-requests', requestData),
  mine: () => api.get('/blood-requests/mine'),
  getById: (id) => api.get(`/blood-requests/${id}`),
  remove: (id) => api.delete(`/blood-requests/${id}`),
  cancel: (id) => api.patch(`/blood-requests/${id}/cancel`),
}
