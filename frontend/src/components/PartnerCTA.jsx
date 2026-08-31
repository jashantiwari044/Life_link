import { Link } from 'react-router-dom'

const partners = [
  { label: 'Register Hospital', role: 'hospital' },
  { label: 'Register NGO', role: 'ngo' },
  { label: 'Register Blood Bank', role: 'bloodbank' },
]

const btnPrimary =
  'inline-flex items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold bg-pink text-white shadow-[0_8px_20px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark'

export default function PartnerCTA() {
  return (
    <section className="py-[72px] text-center bg-navbar">
      <div className="max-w-[1160px] mx-auto px-6">
        <h2 className="text-[30px] font-extrabold mb-10">
          Want to partner with <span className="text-pink">LifeLink</span>?
        </h2>
        <div className="flex gap-4 justify-center flex-wrap">
          {partners.map((partner) => (
            <Link
              key={partner.role}
              to={`/register?role=${partner.role}`}
              className={btnPrimary}
            >
              {partner.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
