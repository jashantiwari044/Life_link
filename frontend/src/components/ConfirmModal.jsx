import { useState } from 'react'
import Modal from './Modal.jsx'

const dangerBtn =
  'inline-flex items-center justify-center rounded-full px-6 py-[10px] text-[14px] font-semibold bg-[#d5233f] text-white transition-transform duration-150 hover:-translate-y-px disabled:opacity-50'
const primaryBtn =
  'inline-flex items-center justify-center rounded-full px-6 py-[10px] text-[14px] font-semibold bg-pink text-white transition-transform duration-150 hover:-translate-y-px hover:bg-pink-dark disabled:opacity-50'
const outlineBtn =
  'inline-flex items-center justify-center rounded-full px-6 py-[10px] text-[14px] font-semibold bg-white text-ink border border-line transition-transform duration-150 hover:-translate-y-px disabled:opacity-50'

/**
 * Confirmation gate for irreversible actions (cancel a request, unlink a blood
 * bank, approve/reject an organization).
 *
 * `onConfirm` may return a promise — the buttons stay disabled until it settles,
 * and a rejection is surfaced inside the modal instead of closing it silently.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Go Back',
  tone = 'danger',
  onConfirm,
  onCancel,
  children,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setError('')
    setBusy(true)
    try {
      await onConfirm?.()
    } catch (err) {
      setError(err?.detail?.detail ?? err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    if (busy) return
    setError('')
    onCancel?.()
  }

  return (
    <Modal open={open} title={title} onClose={handleCancel}>
      {message && <p className="text-sm text-muted">{message}</p>}
      {children && <div className="mt-4">{children}</div>}
      {error && <p className="text-pink-dark text-xs font-semibold mt-4">{error}</p>}

      <div className="flex justify-end gap-3 flex-wrap mt-6">
        <button type="button" className={outlineBtn} disabled={busy} onClick={handleCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === 'danger' ? dangerBtn : primaryBtn}
          disabled={busy}
          onClick={handleConfirm}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
