const links = ['About', 'Contact', 'FAQ', 'Privacy', 'Terms', 'Social Links']

export default function Footer() {
  return (
    <footer className="py-8">
      <div className="max-w-[1160px] mx-auto px-6 flex items-center justify-center">
        <nav className="text-muted text-[13px] font-semibold uppercase tracking-[0.6px]">
          {links.map((link, i) => (
            <span key={link}>
              <a href="#footer">{link}</a>
              {i < links.length - 1 && <span className="mx-[14px] text-pink">•</span>}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  )
}
