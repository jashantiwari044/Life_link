import { useState, useEffect } from 'react'
import { CheckCircle2, Sliders, Shield, Bell } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout.jsx'
import { adminSidebarLinks } from '../../config/sidebarLinks.js'
import { labelClass, inputClass } from '../../constants/formStyles.js'

const DEFAULT_SETTINGS = {
  sosRadiusKm: 15,
  donationCooldownDays: 90,
  emailNotifications: true,
  autoVerifyHospitals: false,
}

const btnSubmit =
  'inline-flex items-center justify-center rounded-full text-xs font-bold bg-pink text-white shadow-[0_4px_12px_rgba(242,70,125,0.25)] transition-all hover:bg-pink-dark w-full mt-2 py-3 cursor-pointer'

export default function Settings() {
  const [values, setValues] = useState(() => {
    const saved = localStorage.getItem('lifelink_admin_settings')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SETTINGS
  })
  const [saved, setSaved] = useState(false)

  function handleChange(field, value) {
    setValues((v) => ({ ...v, [field]: value }))
    setSaved(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    localStorage.setItem('lifelink_admin_settings', JSON.stringify(values))
    setSaved(true)
  }

  return (
    <DashboardLayout active="Settings" links={adminSidebarLinks}>
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink tracking-tight mb-1">
        Platform Settings
      </h1>
      <p className="text-muted text-sm mb-6">Global platform parameters and dispatch configuration.</p>

      <form
        className="bg-white border border-line rounded-[14px] p-8 max-w-[480px] flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="sosRadiusKm" className={labelClass}>SOS Radius (km)</label>
          <input
            id="sosRadiusKm"
            type="number"
            min="1"
            value={values.sosRadiusKm}
            onChange={(e) => handleChange('sosRadiusKm', Number(e.target.value))}
            className={`${inputClass} border-line`}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="donationCooldownDays" className={labelClass}>Donation Cooldown (days)</label>
          <input
            id="donationCooldownDays"
            type="number"
            min="1"
            value={values.donationCooldownDays}
            onChange={(e) => handleChange('donationCooldownDays', Number(e.target.value))}
            className={`${inputClass} border-line`}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={values.emailNotifications}
            onChange={(e) => handleChange('emailNotifications', e.target.checked)}
            className="w-auto"
          />
          Email Notifications
        </label>

        {saved && (
          <p className="text-sm font-semibold text-[#1f8a3d] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings saved successfully.</span>
          </p>
        )}

        <button type="submit" className={btnSubmit}>
          Save Settings
        </button>
      </form>
    </DashboardLayout>
  )
}
