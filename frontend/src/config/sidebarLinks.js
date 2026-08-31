export const userSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/dashboard' },
  { icon: 'Droplet', label: 'Request Blood', to: '/request-blood' },
  { icon: 'Megaphone', label: 'Published Requests', to: '/published-requests' },
  { icon: 'FileText', label: 'My Requests', to: '/my-requests' },
  { icon: 'History', label: 'Donation Hist.', to: '/donation-history' },
  { icon: 'Bell', label: 'Notifications', to: '/notifications' },
  { icon: 'User', label: 'Profile', to: '/profile' },
]

export const hospitalSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/hospital/dashboard' },
  { icon: 'ClipboardList', label: 'All Requests', to: '/hospital/requests/pending' },
  { icon: 'Building2', label: 'Linked Blood Bank', to: '/hospital/blood-bank' },
  { icon: 'History', label: 'Request History', to: '/hospital/requests/history' },
  { icon: 'CheckCircle2', label: 'Verification', to: '/hospital/verification' },
  { icon: 'User', label: 'Profile', to: '/hospital/profile' },
]

export const bloodBankSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/bloodbank/dashboard' },
  { icon: 'Inbox', label: 'Incoming Requests', to: '/bloodbank/requests' },
  { icon: 'FlaskConical', label: 'Inventory', to: '/bloodbank/inventory' },
  { icon: 'ClipboardList', label: 'Donation Logs', to: '/bloodbank/donations' },
  { icon: 'Tent', label: 'Donation Drives', to: '/bloodbank/camps' },
  { icon: 'User', label: 'Profile', to: '/bloodbank/profile' },
]

export const ngoSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/ngo/dashboard' },
  { icon: 'Tent', label: 'Donation Drives', to: '/ngo/drives' },
  { icon: 'Droplets', label: 'Active Requests', to: '/ngo/requests' },
  { icon: 'CheckCircle2', label: 'My Responses', to: '/ngo/my-responses' },
  { icon: 'User', label: 'Profile', to: '/ngo/profile' },
]

export const adminSidebarLinks = [
  { icon: 'LayoutDashboard', label: 'Dashboard', to: '/admin/dashboard' },
  { icon: 'Users', label: 'User Directory', to: '/admin/users' },
  { icon: 'ShieldCheck', label: 'Org Approvals', to: '/admin/approvals/organizations' },
  { icon: 'FileBarChart', label: 'Reports', to: '/admin/reports' },
  { icon: 'TrendingUp', label: 'Analytics', to: '/admin/analytics' },
  { icon: 'Settings', label: 'Settings', to: '/admin/settings' },
  { icon: 'User', label: 'Profile', to: '/admin/profile' },
]
