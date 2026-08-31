export const currentUser = {
  name: 'Akshat',
  bloodGroup: 'O+',
  dob: '1999-04-12',
  phone: '9876543210',
  email: 'akshat@example.com',
  address: 'Kanke Road, Ranchi, Jharkhand',
}

export const activeRequests = [
  { no: 1, blood: 'O+', status: 'Verified', hospital: 'RIMS', date: '18 July 2026' },
  { no: 2, blood: 'A+', status: 'Verified', hospital: 'Apollo', date: '15 July 2026' },
  { no: 3, blood: 'B-', status: 'Blood Bank Reviewing', hospital: 'Sadar Hospital', date: '12 July 2026' },
]

export const pastRequests = [
  { no: 4, blood: 'O+', status: 'Fulfilled', hospital: 'RIMS', date: '2 June 2026' },
  { no: 5, blood: 'AB-', status: 'Fulfilled', hospital: 'Apollo', date: '20 May 2026' },
  { no: 6, blood: 'B+', status: 'Rejected', hospital: 'Sadar Hospital', date: '30 April 2026' },
]

export const sosRequests = [
  { blood: 'O-', hospital: 'RIMS', distance: '2 km', priority: 'Emergency' },
  { blood: 'A-', hospital: 'Apollo', distance: '8 km', priority: 'Urgent' },
]

export const donationHistory = [
  { no: 1, blood: 'O+', units: 1, location: 'RIMS, Ranchi', date: '2 June 2026', status: 'Completed' },
  { no: 2, blood: 'O+', units: 1, location: 'City Hospital Blood Camp', date: '15 March 2026', status: 'Completed' },
  { no: 3, blood: 'O+', units: 1, location: 'Apollo Blood Bank', date: '10 December 2025', status: 'Completed' },
]

export const notifications = [
  {
    id: 1,
    icon: '🩸',
    message: 'Your request for O+ blood at RIMS has been verified.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: 2,
    icon: '🚨',
    message: 'Emergency SOS request for O- blood near you at RIMS (2 km).',
    time: '5 hours ago',
    read: false,
  },
  {
    id: 3,
    icon: '🏕',
    message: 'City Hospital Blood Camp is happening on 20 July 2026.',
    time: '1 day ago',
    read: true,
  },
  {
    id: 4,
    icon: '✔',
    message: 'Thank you! Your donation at RIMS was recorded successfully.',
    time: '3 days ago',
    read: true,
  },
]

export const donationDrives = [
  { name: 'City Hospital Blood Camp', date: '20 July 2026', venue: 'RIMS, Ranchi' },
  { name: 'Community Donation Drive', date: '28 July 2026', venue: 'Town Hall Grounds' },
  { name: 'College Blood Donation Day', date: '3 Aug 2026', venue: 'Central University' },
]
