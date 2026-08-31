export const currentNgo = {
  name: 'Hope Foundation',
  regNumber: 'NGO-2022-0356',
  contactPerson: 'Sunita Rao',
  phone: '9345678901',
  email: 'contact@hopefoundation.org',
  address: 'Circular Road, Ranchi, Jharkhand',
}

export const donationDrives = [
  { id: 1, name: 'City Hospital Blood Camp', date: '20 July 2026', venue: 'RIMS, Ranchi', status: 'Upcoming' },
  { id: 2, name: 'Community Donation Drive', date: '28 July 2026', venue: 'Town Hall Grounds', status: 'Upcoming' },
  { id: 3, name: 'College Blood Donation Day', date: '3 Aug 2026', venue: 'Central University', status: 'Draft' },
]

export const activeRequests = [
  { id: 1, patientName: 'Ramesh Yadav', blood: 'B-', units: 2, hospital: 'RIMS', status: 'Coordinating' },
  { id: 2, patientName: 'Kavita Devi', blood: 'AB+', units: 1, hospital: 'Apollo', status: 'Accepted' },
]

export const requestDetail = {
  id: 1,
  patientName: 'Ramesh Yadav',
  age: 47,
  blood: 'B-',
  units: 2,
  hospital: 'RIMS',
  status: 'Coordinating',
  notes: 'Family unable to find B- donors locally. NGO reaching out to registered donor network.',
  submittedAt: '19 July 2026, 4:00 PM',
}

export const managedUsers = [
  { id: 1, name: 'Akshat', bloodGroup: 'O+', role: 'Donor', phone: '9876543210' },
  { id: 2, name: 'Priya Sharma', bloodGroup: 'A-', role: 'Donor', phone: '9812345670' },
  { id: 3, name: 'Ravi Verma', bloodGroup: 'B+', role: 'Donor', phone: '9823456781' },
  { id: 4, name: 'Sana Khan', bloodGroup: 'O+', role: 'Volunteer', phone: '9834567892' },
]
