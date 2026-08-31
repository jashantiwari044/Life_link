import { Calendar, MapPin } from 'lucide-react'

const drives = [
  { name: 'City Hospital Blood Camp', date: '20 July 2026', venue: 'RIMS, Ranchi' },
  { name: 'Community Donation Drive', date: '28 July 2026', venue: 'Town Hall Grounds' },
  { name: 'College Blood Donation Day', date: '3 Aug 2026', venue: 'Central University' },
]

export default function DonationDrives() {
  return (
    <section className="py-[72px] text-center">
      <div className="max-w-[1160px] mx-auto px-6">
        <h2 className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-ink mb-10">
          Donation <span className="text-pink">Drives</span>
        </h2>
        <div className="flex gap-6 justify-center flex-wrap mb-[28px]">
          {drives.map((drive) => (
            <div
              className="bg-[linear-gradient(135deg,#ffb3c6_0%,#f2467d_55%,#e0295f_100%)] rounded-2xl p-6 w-[260px] min-h-[160px] text-left text-white shadow-md transition-transform duration-200 hover:-translate-y-1"
              key={drive.name}
            >
              <h3 className="text-base font-bold mb-3">{drive.name}</h3>
              <p className="text-white/90 text-xs mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{drive.date}</span>
              </p>
              <p className="text-white/90 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{drive.venue}</span>
              </p>
            </div>
          ))}
        </div>
        <a
          className="text-pink-dark text-sm font-bold border-b-2 border-pink-dark pb-[2px] hover:text-pink transition-colors"
          href="#donation-drives"
        >
          View All Drives →
        </a>
      </div>
    </section>
  )
}
