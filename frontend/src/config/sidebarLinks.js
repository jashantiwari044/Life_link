export const hospitalSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/hospital/dashboard' },
  { icon: 'Droplet', label: 'Raise Blood Request', to: '/hospital/requests/new' },
  { icon: 'ClipboardList', label: 'All Requests', to: '/hospital/requests/pending' },
  { icon: 'Building2', label: 'Connected Blood Banks', to: '/hospital/blood-bank' },
  { icon: 'History', label: 'Request History', to: '/hospital/requests/history' },
  { icon: 'User', label: 'Profile', to: '/hospital/profile' },
]

export const bloodBankSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/bloodbank/dashboard' },
  { icon: 'Inbox', label: 'Incoming Requests', to: '/bloodbank/requests' },
  { icon: 'FlaskConical', label: 'Inventory & Shortages', to: '/bloodbank/inventory' },
  { icon: 'Building2', label: 'Connected Hospitals', to: '/bloodbank/hospitals' },
  { icon: 'Tent', label: 'Donation Drives', to: '/bloodbank/camps' },
  { icon: 'User', label: 'Profile', to: '/bloodbank/profile' },
]

export const ngoSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/ngo/dashboard' },
  { icon: 'Tent', label: 'Donation Drives', to: '/ngo/drives' },
  { icon: 'AlertTriangle', label: 'Shortage Alerts', to: '/ngo/shortages' },
  { icon: 'User', label: 'Profile', to: '/ngo/profile' },
]

export const adminSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/admin/dashboard' },
  { icon: 'ShieldCheck', label: 'Org Approvals', to: '/admin/approvals/organizations' },
  { icon: 'FileBarChart', label: 'Reports', to: '/admin/reports' },
  { icon: 'TrendingUp', label: 'Analytics', to: '/admin/analytics' },
  { icon: 'Settings', label: 'Settings', to: '/admin/settings' },
  { icon: 'User', label: 'Profile', to: '/admin/profile' },
]

export const userSidebarLinks = []

