export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 420" className="w-full h-auto" aria-hidden="true">
      <circle cx="80" cy="70" r="14" fill="none" stroke="#c9c3f5" strokeWidth="3" />
      <circle cx="360" cy="130" r="10" fill="none" stroke="#f2467d" strokeWidth="3" />
      <circle cx="40" cy="220" r="10" fill="none" stroke="#f2467d" strokeWidth="3" />

      <rect x="140" y="40" width="150" height="180" rx="10" fill="#efeafc" />
      <rect x="165" y="60" width="24" height="24" fill="#fff" />
      <rect x="173" y="52" width="8" height="40" fill="#c9c3f5" />
      <rect x="153" y="72" width="40" height="8" fill="#c9c3f5" />

      <g>
        <rect x="210" y="150" width="120" height="150" rx="12" fill="#8b7fd9" />
        <rect x="222" y="166" width="96" height="26" rx="4" fill="#fff" />
        <rect x="222" y="200" width="96" height="26" rx="4" fill="#fff" />
        <rect x="222" y="234" width="96" height="26" rx="4" fill="#fff" />
        <rect x="222" y="268" width="96" height="26" rx="4" fill="#fff" />
        {[176, 210, 244, 278].map((y) => (
          <rect key={y} x="230" y={y - 8} width="14" height="18" rx="3" fill="#f2467d" />
        ))}
      </g>

      <path
        d="M110 190 C110 140 175 95 175 95 C175 95 240 140 240 190 C240 226 210 255 175 255 C140 255 110 226 110 190 Z"
        fill="#f2467d"
        transform="translate(-20 90) scale(0.62)"
      />
      <path
        d="M100 300 C100 250 150 210 150 210 C150 210 200 250 200 300 C200 328 178 350 150 350 C122 350 100 328 100 300 Z"
        fill="#f2467d"
      />
      <ellipse cx="128" cy="290" rx="10" ry="16" fill="#ff8fab" opacity="0.6" />

      <rect x="60" y="360" width="300" height="10" rx="5" fill="#f3d9e2" />
    </svg>
  )
}
