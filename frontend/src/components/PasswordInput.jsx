import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Password field with a show/hide toggle.
 *
 * The button is deliberately `tabIndex={-1}` so tabbing runs straight from the
 * field to the submit button, and `aria-pressed` reports the current state to
 * screen readers.
 */
export default function PasswordInput({ id, className = '', ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={`${className} w-full pr-11`}
        {...inputProps}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={id}
        title={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors bg-transparent border-none p-0 leading-none"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
