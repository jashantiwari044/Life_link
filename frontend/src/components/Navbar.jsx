import { Link } from 'react-router-dom'

const navBtn =
  'inline-flex items-center justify-center rounded-full border border-line bg-white text-ink font-semibold text-[14px] px-[22px] py-[10px] transition-transform duration-150 hover:-translate-y-px'

export default function Navbar() {
  return (
    <header className="bg-navbar py-[18px]">
      <div className="max-w-[1160px] mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="text-[22px] font-extrabold tracking-[0.5px]">
          LifeLink
        </Link>
        <nav className="flex gap-3">
          <Link to="/login" className={navBtn}>
            Login
          </Link>
          <Link to="/register" className={navBtn}>
            Register
          </Link>
        </nav>
      </div>
    </header>
  )
}
