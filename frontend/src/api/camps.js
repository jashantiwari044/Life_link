import { api } from './client.js'

export const campsApi = {
  list: (limit) => api.get('/camps', limit ? { limit } : undefined),
  myRegistrations: () => api.get('/camps/my-registrations'),
  register: (id) => api.post(`/camps/${id}/register`),
}
