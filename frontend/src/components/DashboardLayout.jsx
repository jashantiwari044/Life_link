import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Droplet,
  Droplets,
  Megaphone,
  FileText,
  History,
  Bell,
  User,
  Building2,
  ClipboardList,
  CheckCircle2,
  Inbox,
  FlaskConical,
  Tent,
  Users,
  ShieldCheck,
  FileBarChart,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  HeartPulse,
  HeartHandshake,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react'
import { userSidebarLinks } from '../config/sidebarLinks.js'
import { useAuth } from '../context/AuthContext.jsx'

const ICON_MAP = {
  LayoutDashboard,
  Droplet,
  Droplets,
  Megaphone,
  FileText,
  History,
  Bell,
  User,
  Building2,
  ClipboardList,
  CheckCircle2,
  Inbox,
  FlaskConical,
  Tent,
  Users,
  ShieldCheck,
  FileBarChart,
  TrendingUp,
  Settings,
  HeartHandshake,
}

const ROLE_CONFIG = {
  admin: {
    portalTitle: 'System Admin Command',
    mobileTitle: 'Admin',
    roleBadge: 'bg-slate-900 text-white border-slate-700 shadow-xs',
    accentStripe: 'bg-gradient-to-r from-slate-900 via-indigo-600 to-slate-800',
    avatarBg: 'bg-gradient-to-tr from-slate-900 to-indigo-700 text-white shadow-[0_4px_12px_rgba(30,27,75,0.4)]',
    icon: ShieldCheck,
    tagLabel: 'Platform Superadmin',
    brandTag: 'ADMIN CONSOLE',
    brandTagBg: 'bg-slate-900 text-white',
    logoGlow: 'bg-slate-900 shadow-[0_4px_12px_rgba(15,23,42,0.4)]',
  },
  hospital: {
    portalTitle: 'Hospital Clinical Portal',
    mobileTitle: 'Hospital',
    roleBadge: 'bg-blue-50 text-blue-700 border-blue-200/80 shadow-xs',
    accentStripe: 'bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600',
    avatarBg: 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)]',
    icon: Building2,
    tagLabel: 'Clinical Healthcare Partner',
    brandTag: 'HOSPITAL CLINICAL',
    brandTagBg: 'bg-blue-50 text-blue-700 border border-blue-200',
    logoGlow: 'bg-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.4)]',
  },
  blood_bank: {
    portalTitle: 'Blood Bank & Storage Hub',
    mobileTitle: 'Blood Bank',
    roleBadge: 'bg-rose-50 text-rose-700 border-rose-200/80 shadow-xs',
    accentStripe: 'bg-gradient-to-r from-rose-600 via-pink to-red-600',
    avatarBg: 'bg-gradient-to-tr from-rose-600 to-pink text-white shadow-[0_4px_12px_rgba(225,29,72,0.35)]',
    icon: FlaskConical,
    tagLabel: 'Certified Blood Bank',
    brandTag: 'BLOOD BANK HUB',
    brandTagBg: 'bg-rose-50 text-rose-700 border border-rose-200',
    logoGlow: 'bg-rose-600 shadow-[0_4px_12px_rgba(225,29,72,0.4)]',
  },
  ngo: {
    portalTitle: 'Community NGO Partner',
    mobileTitle: 'NGO',
    roleBadge: 'bg-purple-50 text-purple-700 border-purple-200/80 shadow-xs',
    accentStripe: 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-500',
    avatarBg: 'bg-gradient-to-tr from-purple-600 to-fuchsia-500 text-white shadow-[0_4px_12px_rgba(147,51,234,0.35)]',
    icon: HeartHandshake,
    tagLabel: 'Community & Drives Partner',
    brandTag: 'NGO COMMUNITY',
    brandTagBg: 'bg-purple-50 text-purple-700 border border-purple-200',
    logoGlow: 'bg-purple-600 shadow-[0_4px_12px_rgba(147,51,234,0.4)]',
  },
  user: {
    portalTitle: 'LifeLink Hero Community',
    mobileTitle: 'Hero Donor',
    roleBadge: 'bg-pink-light text-pink-dark border-pink/30 shadow-xs',
    accentStripe: 'bg-gradient-to-r from-pink via-rose-400 to-pink-dark',
    avatarBg: 'bg-gradient-to-tr from-pink to-rose-400 text-white shadow-[0_4px_12px_rgba(242,70,125,0.35)]',
    icon: Droplet,
    tagLabel: 'Community Life Saver',
    brandTag: 'COMMUNITY HERO',
    brandTagBg: 'bg-pink-light text-pink-dark border border-pink/20',
    logoGlow: 'bg-pink shadow-[0_4px_12px_rgba(242,70,125,0.4)]',
  },
}

function detectRole(authRole, profile, pathname) {
  // 1. Path-based detection is definitive for routed sections
  if (pathname.startsWith('/hospital')) return 'hospital'
  if (pathname.startsWith('/bloodbank')) return 'blood_bank'
  if (pathname.startsWith('/ngo')) return 'ngo'
  if (pathname.startsWith('/admin')) return 'admin'

  // 2. Auth context role detection
  if (authRole) {
    const r = authRole.toLowerCase()
    if (r === 'blood_bank' || r === 'bloodbank') return 'blood_bank'
    if (r === 'hospital') return 'hospital'
    if (r === 'ngo') return 'ngo'
    if (r === 'admin') return 'admin'
    if (r === 'user') return 'user'
  }

  // 3. Profile organization type
  if (profile?.org_type) {
    const ot = profile.org_type.toLowerCase()
    if (ot === 'blood_bank' || ot === 'bloodbank') return 'blood_bank'
    if (ot === 'hospital') return 'hospital'
    if (ot === 'ngo') return 'ngo'
  }

  // 4. Profile user role
  if (profile?.role) {
    const r = profile.role.toLowerCase()
    if (r === 'admin') return 'admin'
    if (r === 'hospital') return 'hospital'
    if (r === 'blood_bank' || r === 'bloodbank') return 'blood_bank'
    if (r === 'ngo') return 'ngo'
    if (r === 'user') return 'user'
  }

  return 'user'
}

function RenderIcon({ name, className = 'w-4 h-4' }) {
  const IconComponent = ICON_MAP[name]
  if (!IconComponent) return <Droplet className={className} />
  return <IconComponent className={className} />
}

export default function DashboardLayout({
  active,
  children,
  links = userSidebarLinks,
  user = null,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user: profile, role: authRole } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const displayName = user?.name ?? profile?.full_name ?? profile?.org_name ?? 'Account'
  const userInitials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const detectedRole = useMemo(
    () => detectRole(authRole, profile, location.pathname),
    [authRole, profile, location.pathname]
  )
  const roleConfig = ROLE_CONFIG[detectedRole] || ROLE_CONFIG.user
  const RoleIcon = roleConfig.icon

  const profileLink = links.find((l) => l.label === 'Profile')
  const profilePath =
    profileLink?.to ||
    (detectedRole === 'hospital'
      ? '/hospital/profile'
      : detectedRole === 'blood_bank'
      ? '/bloodbank/profile'
      : detectedRole === 'ngo'
      ? '/ngo/profile'
      : detectedRole === 'admin'
      ? '/admin/profile'
      : '/profile')

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col flex-1 min-h-svh bg-[#fcfbfa] text-ink antialiased">
      {/* Ambient Top Identity Accent Stripe */}
      <div className={`h-1.5 w-full shrink-0 shadow-2xs ${roleConfig.accentStripe}`} />

      <div className="flex flex-1 min-h-0">
        {/* Mobile Backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity duration-200"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Desktop & Mobile Drawer Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-line flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-60 shrink-0 shadow-xs lg:shadow-none ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            {/* Brand Header with Distinct Role Sub-Badge */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line/70">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div
                  className={`w-9 h-9 rounded-xl ${roleConfig.logoGlow} flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-105 shrink-0`}
                >
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-ink block leading-tight">
                    LifeLink
                  </span>
                  <span
                    className={`inline-block text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 mt-0.5 rounded uppercase ${roleConfig.brandTagBg}`}
                  >
                    {roleConfig.brandTag}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:bg-slate-100 lg:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="p-3 flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-170px)]">
              {links.map((item) => {
                const isActive = item.label === active || location.pathname === item.to
                return item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-pink-light text-pink-dark shadow-xs'
                        : 'text-muted hover:text-ink hover:bg-slate-50'
                    }`}
                  >
                    <RenderIcon
                      name={item.icon}
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-pink-dark' : 'text-slate-400 group-hover:text-ink'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-slate-300 cursor-not-allowed"
                  >
                    <RenderIcon name={item.icon} className="w-4 h-4 text-slate-300" />
                    <span>{item.label}</span>
                  </span>
                )
              })}
            </nav>
          </div>

          {/* User Card & Logout Footer with Distinct Role Persona */}
          <div className="p-3 border-t border-line/70">
            <Link
              to={profilePath}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 mb-2 hover:border-pink/40 hover:bg-pink-light/20 transition-all group"
              title="View profile"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl ${roleConfig.avatarBg} flex items-center justify-center text-xs font-extrabold shrink-0`}
                >
                  {userInitials || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate leading-tight group-hover:text-pink-dark transition-colors">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <RoleIcon className="w-2.5 h-2.5 text-muted shrink-0" />
                    <p className="text-[10px] text-muted font-semibold truncate">
                      {roleConfig.tagLabel}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#d5233f] hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main App Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 bg-white/90 backdrop-blur-md border-b border-line">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-xl text-ink hover:bg-slate-100 lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                to="/"
                className="font-extrabold text-base tracking-tight text-ink lg:hidden flex items-center gap-2"
              >
                <div
                  className={`w-6 h-6 rounded-lg ${roleConfig.logoGlow} flex items-center justify-center text-white text-xs shrink-0`}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                </div>
                <span>LifeLink</span>
              </Link>
              <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-muted">
                <span>Platform</span>
                <span>/</span>
                <span className="text-ink font-bold">{active || 'Dashboard'}</span>
              </div>
            </div>

            {/* Prominent Role Portal Badge Pill (Visible across screen sizes) */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${roleConfig.roleBadge}`}
            >
              <RoleIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{roleConfig.portalTitle}</span>
              <span className="sm:hidden">{roleConfig.mobileTitle}</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {links.some((l) => l.to === '/notifications') && (
                <Link
                  to="/notifications"
                  className="p-2 rounded-full text-slate-500 hover:text-pink-dark hover:bg-pink-light/40 transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink ring-2 ring-white" />
                </Link>
              )}

              <Link
                to={profilePath}
                className="flex items-center gap-2 py-1 px-2.5 rounded-full hover:bg-slate-100 transition-colors"
                title="My Profile"
              >
                <div
                  className={`w-7 h-7 rounded-full ${roleConfig.avatarBg} flex items-center justify-center text-xs font-extrabold`}
                >
                  {userInitials || 'U'}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-ink max-w-[130px] truncate">
                  {displayName}
                </span>
              </Link>
            </div>
          </header>

          {/* Content Area */}
          <main className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-16 text-left w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
