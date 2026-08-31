import { api } from './client.js'

export const orgsApi = {
  getMe: () => api.get('/orgs/me'),
  updateMe: (updates) => api.put('/orgs/me', updates),
}
