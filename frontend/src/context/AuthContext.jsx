import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, usersApi, orgsApi, ApiError, getToken, setToken as persistToken } from '../api/index.js'

const AuthContext = createContext(null)

export const dashboardPathForRole = {
  user: '/dashboard',
  admin: '/admin/dashboard',
  hospital: '/hospital/dashboard',
  blood_bank: '/bloodbank/dashboard',
  ngo: '/ngo/dashboard',
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isOrgRole(role) {
  return role === 'hospital' || role === 'blood_bank' || role === 'ngo'
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [role, setRole] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    persistToken(null)
    setTokenState(null)
    setRole(null)
    setUser(null)
  }, [])

  const hydrate = useCallback(async (activeToken) => {
    const payload = decodeJwt(activeToken)
    if (!payload) {
      clearSession()
      return
    }
    const currentRole = payload.role
    try {
      const profile = isOrgRole(currentRole) ? await orgsApi.getMe() : await usersApi.getMe()
      setRole(currentRole)
      setUser(profile)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession()
      }
    }
  }, [clearSession])

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (token) {
        await hydrate(token)
      }
      if (!cancelled) setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(identifier, password) {
    let result
    try {
      result = await authApi.login(identifier, password)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        result = await authApi.orgLogin(identifier, password)
      } else {
        throw err
      }
    }
    persistToken(result.access_token)
    setTokenState(result.access_token)
    await hydrate(result.access_token)
    const payload = decodeJwt(result.access_token)
    return payload?.role
  }

  async function register(userData) {
    await authApi.register(userData)
    return login(userData.email, userData.password)
  }

  async function registerOrganization(orgData) {
    return authApi.orgRegister(orgData)
  }

  function logout() {
    clearSession()
  }

  const value = {
    token,
    role,
    user,
    loading,
    isAuthenticated: Boolean(token && role),
    login,
    register,
    registerOrganization,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
