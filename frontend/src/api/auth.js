import { api } from './client.js'

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }),
  register: (userData) => api.post('/auth/register', userData),
  orgLogin: (identifier, password) => api.post('/auth/org/login', { identifier, password }),
  orgRegister: (orgData) => api.post('/auth/org/register', orgData),
  listHospitals: () => api.get('/auth/hospitals'),
}
