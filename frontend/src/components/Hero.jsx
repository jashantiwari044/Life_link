import { Link } from 'react-router-dom'
import HeroIllustration from './HeroIllustration.jsx'

const btnPrimary =
  'inline-flex items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold bg-pink text-white shadow-[0_8px_20px_rgba(242,70,125,0.35)] transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark'
const btnSecondary =
  'inline-flex items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold bg-pink-light text-pink-dark transition-transform duration-150 hover:-translate-y-px'

export default function Hero() {
  return (
    <section className="relative pt-16">
      <div className="max-w-[1160px] mx-auto px-6 flex items-center gap-12 relative max-[860px]:flex-col max-[860px]:text-center">
        <div className="flex-none w-[380px]">
          <HeroIllustration />
        </div>
        <div className="flex-1 text-left max-[860px]:text-center">
          <h1 className="text-[52px] font-extrabold leading-[1.1] tracking-[-1px] mb-5">
            Donate <span className="text-pink">Blood</span>. Save Lives.
          </h1>
          <p className="text-[17px] text-muted max-w-[480px] leading-[1.6] mb-8 max-[860px]:mx-auto">
            One platform connecting blood donors, hospitals, NGOs and people in
            need during emergencies.
          </p>
          <div className="flex gap-4 max-[860px]:justify-center">
            <Link to="/register" className={btnPrimary}>
              Donate Blood
            </Link>
            <Link to="/register" className={btnSecondary}>
              Request Blood
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-[40%] flex flex-col gap-[10px] max-[860px]:hidden">
          <span className="w-2 h-2 rounded-full bg-pink" />
          <span className="w-2 h-2 rounded-full bg-line" />
          <span className="w-2 h-2 rounded-full bg-line" />
        </div>
      </div>
      <div className="text-center text-white text-[13px] font-semibold tracking-[0.5px] relative z-[1] pt-[90px] -mt-[70px]">
        ▼ Scroll to Learn More ▼
      </div>
      <div className="w-full leading-none -mt-2" aria-hidden="true">
        <svg viewBox="0 0 1440 180" preserveAspectRatio="none" className="w-full h-[160px] block">
          <path
            d="M0,80 C240,160 480,0 720,60 C960,120 1200,40 1440,90 L1440,180 L0,180 Z"
            fill="url(#waveGradient)"
          />
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffb3c6" />
              <stop offset="55%" stopColor="#f2467d" />
              <stop offset="100%" stopColor="#e0295f" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  )
}
