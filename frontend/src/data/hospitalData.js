export const currentHospital = {
  name: 'RIMS, Ranchi',
  regNumber: 'HRF-2024-0187',
  contactPerson: 'Dr. Amit Kumar',
  phone: '9123456780',
  email: 'contact@rims-ranchi.org',
  address: 'Bariatu Road, Ranchi, Jharkhand',
}

export const verificationStatus = {
  status: 'Verified',
  verifiedOn: '15 January 2025',
  documents: [
    { name: 'Hospital Registration Certificate', status: 'Approved' },
    { name: 'Medical Council License', status: 'Approved' },
    { name: 'Government ID Proof (Admin)', status: 'Approved' },
  ],
}

export const pendingRequests = [
  { id: 1, patientName: 'Suresh Mahato', blood: 'O-', units: 2, urgency: 'Emergency', status: 'Awaiting Blood Bank' },
  { id: 2, patientName: 'Neha Kumari', blood: 'A+', units: 1, urgency: 'Urgent', status: 'Verified' },
  { id: 3, patientName: 'Ravi Oraon', blood: 'B+', units: 3, urgency: 'Normal', status: 'Pending Verification' },
]

export const linkedBloodBanks = [
  { name: 'Ranchi Central Blood Bank', status: 'Connected' },
]

export const availableBloodBanks = [
  'Apollo Blood Bank',
  'Sadar Hospital Blood Bank',
  'Red Cross Blood Bank, Ranchi',
]

export const reviewRequest = {
  id: 1,
  patientName: 'Suresh Mahato',
  age: 54,
  blood: 'O-',
  units: 2,
  urgency: 'Emergency',
  ward: 'ICU, Ward 4',
  reason: 'Internal bleeding following a road traffic accident, requires immediate transfusion.',
  submittedAt: '20 July 2026, 9:40 AM',
}

export const incomingDelivery = {
  requestId: 2,
  patientName: 'Neha Kumari',
  blood: 'A+',
  units: 1,
  bloodBank: 'Ranchi Central Blood Bank',
  dispatchedAt: '19 July 2026, 6:15 PM',
}

export const requestHistory = [
  { id: 101, patientName: 'Anita Devi', blood: 'AB+', units: 1, date: '10 July 2026', status: 'Fulfilled' },
  { id: 102, patientName: 'Manoj Singh', blood: 'O+', units: 2, date: '2 July 2026', status: 'Fulfilled' },
]
