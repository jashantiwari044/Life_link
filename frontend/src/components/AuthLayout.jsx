import { Link } from 'react-router-dom'

export default function AuthLayout({ title, subtitle, children, footer, wide }) {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10 bg-[linear-gradient(160deg,#fff_0%,#ffe3ec_55%,#ffc2d4_100%)]">
      <div
        className={`w-full bg-white rounded-[20px] px-8 py-9 shadow-[0_20px_50px_rgba(224,41,95,0.15)] text-center ${wide ? 'max-w-[560px]' : 'max-w-[420px]'}`}
      >
        <Link to="/" className="inline-block text-xl font-extrabold mb-5">
          LifeLink
        </Link>
        <h1 className="text-[26px] font-extrabold mb-[6px]">{title}</h1>
        {subtitle && <p className="text-muted text-sm mb-6">{subtitle}</p>}
        {children}
        {footer && (
          <div className="mt-[22px] text-sm text-muted [&_a]:text-pink-dark [&_a]:font-semibold">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
