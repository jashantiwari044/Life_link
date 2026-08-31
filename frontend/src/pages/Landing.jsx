import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import WhyDonate from '../components/WhyDonate.jsx'
import DonationDrives from '../components/DonationDrives.jsx'
import PartnerCTA from '../components/PartnerCTA.jsx'
import Footer from '../components/Footer.jsx'

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <HowItWorks />
      <WhyDonate />
      <DonationDrives />
      <PartnerCTA />
      <Footer />
    </div>
  )
}
