const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\d{10}$/
const AADHAAR_RE = /^\d{12}$/

export function isRequired(value) {
  return value != null && String(value).trim().length > 0
}

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value).trim())
}

export function isValidPhone(value) {
  return PHONE_RE.test(String(value).replace(/[\s-]/g, ''))
}

export function isValidAadhaar(value) {
  return AADHAAR_RE.test(String(value).replace(/\s/g, ''))
}

export function isValidPassword(value) {
  return String(value).length >= 8
}

export function isValidDob(value) {
  if (!value) return false
  const dob = new Date(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dob > today) return false
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 120)
  if (dob < minDate) return false
  return true
}

export function isEmailOrPhone(value) {
  const trimmed = String(value).trim()
  return isValidEmail(trimmed) || isValidPhone(trimmed.replace(/[\s-]/g, ''))
}
