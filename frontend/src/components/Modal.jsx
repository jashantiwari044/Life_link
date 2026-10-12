import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Generic overlay shell. Closes on Escape and on backdrop click; the panel
 * itself swallows clicks so interacting with the content never dismisses it.
 */
export default function Modal({ open, title, onClose, children, footer, width = 'max-w-[520px]' }) {
  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      // z-[9999] clears Leaflet: its map controls sit at z-index 1000, so a
      // z-50 overlay rendered under any map on the page.
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs px-4 py-8 animate-in fade-in duration-150"
      role="presentation"
      onClick={() => onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`bg-white rounded-2xl border border-line shadow-[0_20px_60px_rgba(0,0,0,0.15)] w-full ${width} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onClose?.()}
            className="p-1 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">{children}</div>

        {footer && <div className="px-6 py-4 border-t border-line flex justify-end gap-3 flex-wrap">{footer}</div>}
      </div>
    </div>
  )
}
