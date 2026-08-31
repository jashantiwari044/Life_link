import { api } from './client.js'

export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (updates) => api.put('/users/me', updates),
  setDonorMode: (enabled) => api.patch('/users/me/donor-mode', { enabled }),
  updateLocation: (latitude, longitude) => api.patch('/users/me/location', { latitude, longitude }),
  getDonationHistory: () => api.get('/users/me/donation-history'),
  getNearbyRequests: (lat, lng, bloodGroup) =>
    api.get('/users/nearby-requests', { lat, lng, blood_group: bloodGroup }),
  getPublishedRequests: (skip, limit) => api.get('/users/published-requests', { skip, limit }),
  respondToRequest: (id) => api.post(`/users/requests/${id}/respond`),
}
