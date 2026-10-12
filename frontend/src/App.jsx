import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth, dashboardPathForRole } from './context/AuthContext.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Notifications from './pages/Notifications.jsx'

// Hospital pages
import HospitalDashboard from './pages/hospital/Dashboard.jsx'
import HospitalRequestBlood from './pages/hospital/RequestBlood.jsx'
import HospitalPendingRequests from './pages/hospital/PendingRequests.jsx'
import HospitalLinkedBloodBank from './pages/hospital/LinkedBloodBank.jsx'
import HospitalConfirmBloodReceived from './pages/hospital/ConfirmBloodReceived.jsx'
import HospitalRequestHistory from './pages/hospital/RequestHistory.jsx'
import HospitalProfile from './pages/hospital/Profile.jsx'

// Blood Bank pages
import BloodBankDashboard from './pages/bloodbank/Dashboard.jsx'
import BloodBankIncomingRequests from './pages/bloodbank/IncomingRequests.jsx'
import BloodBankInventory from './pages/bloodbank/Inventory.jsx'
import BloodBankSubmitRequestTracking from './pages/bloodbank/SubmitRequestTracking.jsx'
import BloodBankDonationLogs from './pages/bloodbank/DonationLogs.jsx'
import BloodBankVerifyBloodReceived from './pages/bloodbank/VerifyBloodReceived.jsx'
import BloodBankLinkedHospitals from './pages/bloodbank/LinkedHospitals.jsx'
import BloodBankPendingLinkRequests from './pages/bloodbank/PendingLinkRequests.jsx'
import BloodBankUpcomingCamps from './pages/bloodbank/UpcomingCamps.jsx'
import BloodBankProfile from './pages/bloodbank/Profile.jsx'

// NGO pages
import NgoDashboard from './pages/ngo/Dashboard.jsx'
import NgoDonationDrives from './pages/ngo/DonationDrives.jsx'
import NgoPublishDrive from './pages/ngo/PublishDrive.jsx'
import NgoShortages from './pages/ngo/Shortages.jsx'
import NgoActiveRequests from './pages/ngo/ActiveRequests.jsx'
import NgoRequestDetails from './pages/ngo/RequestDetails.jsx'
import NgoMyResponses from './pages/ngo/MyResponses.jsx'
import NgoProfile from './pages/ngo/Profile.jsx'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard.jsx'
import AdminOrganizationApprovals from './pages/admin/OrganizationApprovals.jsx'
import AdminReports from './pages/admin/Reports.jsx'
import AdminAnalytics from './pages/admin/Analytics.jsx'
import AdminSettings from './pages/admin/Settings.jsx'
import AdminUsers from './pages/admin/Users.jsx'
import AdminUserDetails from './pages/admin/UserDetails.jsx'
import AdminProfile from './pages/admin/Profile.jsx'

function RoleDashboardRedirect() {
  const { role, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={dashboardPathForRole[role] ?? '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />

        {/* Common Authenticated Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hospital', 'blood_bank', 'ngo', 'admin']} />}>
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        {/* Hospital Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hospital']} />}>
          <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
          <Route path="/hospital/requests/new" element={<HospitalRequestBlood />} />
          <Route path="/hospital/requests/pending" element={<HospitalPendingRequests />} />
          <Route path="/hospital/blood-bank" element={<HospitalLinkedBloodBank />} />
          <Route path="/hospital/requests/confirm-received" element={<HospitalConfirmBloodReceived />} />
          <Route path="/hospital/requests/history" element={<HospitalRequestHistory />} />
          <Route path="/hospital/profile" element={<HospitalProfile />} />
        </Route>

        {/* Blood Bank Routes */}
        <Route element={<ProtectedRoute allowedRoles={['blood_bank']} />}>
          <Route path="/bloodbank/dashboard" element={<BloodBankDashboard />} />
          <Route path="/bloodbank/requests" element={<BloodBankIncomingRequests />} />
          <Route path="/bloodbank/inventory" element={<BloodBankInventory />} />
          <Route path="/bloodbank/requests/tracking" element={<BloodBankSubmitRequestTracking />} />
          <Route path="/bloodbank/donations" element={<BloodBankDonationLogs />} />
          <Route path="/bloodbank/donations/verify" element={<BloodBankVerifyBloodReceived />} />
          <Route path="/bloodbank/hospitals" element={<BloodBankLinkedHospitals />} />
          <Route path="/bloodbank/hospitals/pending" element={<BloodBankPendingLinkRequests />} />
          <Route path="/bloodbank/camps" element={<BloodBankUpcomingCamps />} />
          <Route path="/bloodbank/profile" element={<BloodBankProfile />} />
        </Route>

        {/* NGO Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ngo']} />}>
          <Route path="/ngo/dashboard" element={<NgoDashboard />} />
          <Route path="/ngo/drives" element={<NgoDonationDrives />} />
          <Route path="/ngo/drives/publish" element={<NgoPublishDrive />} />
          <Route path="/ngo/shortages" element={<NgoShortages />} />
          <Route path="/ngo/requests" element={<NgoActiveRequests />} />
          <Route path="/ngo/requests/details" element={<NgoRequestDetails />} />
          <Route path="/ngo/my-responses" element={<NgoMyResponses />} />
          <Route path="/ngo/profile" element={<NgoProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/approvals/organizations" element={<AdminOrganizationApprovals />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/detail" element={<AdminUserDetails />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
