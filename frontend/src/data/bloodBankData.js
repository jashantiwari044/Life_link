export const currentBloodBank = {
  name: 'Ranchi Central Blood Bank',
  regNumber: 'BBF-2023-0042',
  contactPerson: 'Dr. Meena Toppo',
  phone: '9234567810',
  email: 'contact@ranchibloodbank.org',
  address: 'Main Road, Ranchi, Jharkhand',
}

export const incomingRequests = [
  { id: 1, hospital: 'RIMS, Ranchi', blood: 'O-', units: 2, urgency: 'Emergency', status: 'Awaiting Approval' },
  { id: 2, hospital: 'Apollo', blood: 'A+', units: 1, urgency: 'Urgent', status: 'Approved' },
  { id: 3, hospital: 'Sadar Hospital', blood: 'B+', units: 3, urgency: 'Normal', status: 'Awaiting Approval' },
]

export const linkedHospitals = [
  { name: 'RIMS, Ranchi', status: 'Connected' },
  { name: 'Sadar Hospital', status: 'Connected' },
]

export const publishedRequests = [
  { id: 1, blood: 'O-', units: 2, reason: 'Stock running low ahead of monsoon season', postedAt: '2 days ago' },
  { id: 2, blood: 'AB-', units: 1, reason: 'Rare blood group, no current stock', postedAt: '5 days ago' },
]

export const trackedRequest = {
  id: 1,
  hospital: 'RIMS, Ranchi',
  blood: 'O-',
  units: 2,
  urgency: 'Emergency',
  submittedAt: '20 July 2026, 9:40 AM',
  steps: ['Request Received', 'Verified', 'Dispatched', 'Delivered'],
  currentStep: 1,
}

export const donationLogs = [
  { id: 1, donor: 'Akshat', blood: 'O+', units: 1, date: '2 June 2026', source: 'Walk-in' },
  { id: 2, donor: 'Priya Sharma', blood: 'A-', units: 1, date: '30 May 2026', source: 'City Hospital Blood Camp' },
  { id: 3, donor: 'Ravi Verma', blood: 'B+', units: 1, date: '28 May 2026', source: 'Walk-in' },
  { id: 4, donor: 'Sana Khan', blood: 'O+', units: 1, date: '20 May 2026', source: 'College Blood Donation Day' },
]

export const pendingDonorVerification = {
  donor: 'Vikram Singh',
  bloodGroupClaimed: 'B+',
  bloodGroupTested: 'B+',
  units: 1,
  screenedAt: '20 July 2026, 11:20 AM',
  source: 'Walk-in',
}

export const pendingLinkRequests = [
  { id: 1, hospital: 'Apollo', regNumber: 'HRF-2025-0093', requestedAt: '18 July 2026' },
  { id: 2, hospital: 'Sacred Heart Hospital', regNumber: 'HRF-2024-0211', requestedAt: '16 July 2026' },
]

export const upcomingCamps = [
  { name: 'City Hospital Blood Camp', date: '20 July 2026', venue: 'RIMS, Ranchi', targetUnits: 50 },
  { name: 'Community Donation Drive', date: '28 July 2026', venue: 'Town Hall Grounds', targetUnits: 80 },
  { name: 'College Blood Donation Day', date: '3 Aug 2026', venue: 'Central University', targetUnits: 60 },
]

export const inventorySummary = [
  { blood: 'O+', units: 24 },
  { blood: 'O-', units: 6 },
  { blood: 'A+', units: 18 },
  { blood: 'B+', units: 15 },
]
