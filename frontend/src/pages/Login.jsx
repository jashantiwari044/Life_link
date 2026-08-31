import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { isEmailOrPhone, isRequired } from '../utils/validators.js'
import { useAuth, dashboardPathForRole } from '../context/AuthContext.jsx'
import { ApiError } from '../api/index.js'

const inputClass =
  'border rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [rememberMe, setRememberMe] = useState(false)
  const [values, setValues] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const nextErrors = {}
    if (!isRequired(values.identifier)) {
      nextErrors.identifier = 'Email or phone is required.'
    } else if (!isEmailOrPhone(values.identifier)) {
      nextErrors.identifier = 'Enter a valid email or 10-digit phone number.'
    }
    if (!isRequired(values.password)) {
      nextErrors.password = 'Password is required.'
    }
    return nextErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const role = await login(values.identifier, values.password)
      navigate(dashboardPathForRole[role] ?? '/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.detail?.detail ?? err.message ?? 'Login failed. Please try again.')
      } else {
        setSubmitError('Could not reach the server. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in to continue to LifeLink."
      footer={
        <>
          Don't have an account? <Link to="/register">Register</Link>
        </>
      }
    >
      <form className="text-left flex flex-col gap-4 mt-2" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="identifier" className="text-[13px] font-semibold text-ink">
            Email / Phone
          </label>
          <input
            id="identifier"
            type="text"
            placeholder="you@example.com"
            value={values.identifier}
            onChange={(e) => handleChange('identifier', e.target.value)}
            className={`${inputClass} ${errors.identifier ? 'border-pink-dark' : 'border-line'}`}
          />
          {errors.identifier && (
            <span className="text-pink-dark text-xs font-semibold">{errors.identifier}</span>
          )}
        </div>
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="password" className="text-[13px] font-semibold text-ink">
            Password
          </label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className={`${inputClass} ${errors.password ? 'border-pink-dark' : 'border-line'}`}
          />
          {errors.password && (
            <span className="text-pink-dark text-xs font-semibold">{errors.password}</span>
          )}
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-auto"
            />
            Remember Me
          </label>
          <Link to="#forgot-password" className="text-pink-dark font-semibold">
            Forgot Password?
          </Link>
        </div>
        {submitError && (
          <div className="text-pink-dark text-[13px] font-semibold text-center">{submitError}</div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full text-[15px] font-semibold bg-pink text-white shadow-[0_8px_20px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark w-full mt-1 p-[13px] disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </AuthLayout>
  )
}
