import { Check } from 'lucide-react'
import { buildJourney, TERMINAL_FAILURE_STATUSES } from '../constants/requestStatus.js'

const dotStyles = {
  done: 'bg-[#1f8a3d] text-white border-[#1f8a3d]',
  current: 'bg-pink text-white border-pink shadow-[0_0_0_3px_rgba(242,70,125,0.2)]',
  upcoming: 'bg-white text-muted border-line',
  halted: 'bg-white text-muted border-line',
}

const labelStyles = {
  done: 'text-ink',
  current: 'text-pink-dark font-extrabold',
  upcoming: 'text-muted',
  halted: 'text-muted line-through',
}

/**
 * Vertical stepper showing where a blood request sits in its lifecycle, with a
 * plain-English line under each stage so "VERIFIED" stops being a mystery.
 */
export default function StatusTimeline({ status }) {
  const steps = buildJourney(status)
  const failure = TERMINAL_FAILURE_STATUSES[status]

  return (
    <div>
      {failure && (
        <div className="mb-5 rounded-xl bg-[#ffe1e1] text-[#d5233f] px-4 py-3 border border-red-200">
          <p className="text-sm font-bold">{failure.label}</p>
          <p className="text-[13px] mt-[2px]">{failure.description}</p>
        </div>
      )}

      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={step.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold shrink-0 transition-all ${dotStyles[step.state]}`}
              >
                {step.state === 'done' ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              {index < steps.length - 1 && (
                <span className={`w-[2px] flex-1 min-h-[26px] ${step.state === 'done' ? 'bg-[#1f8a3d]' : 'bg-line'}`} />
              )}
            </div>
            <div className={`pb-6 ${index === steps.length - 1 ? 'pb-0' : ''}`}>
              <p className={`text-sm font-bold ${labelStyles[step.state]}`}>
                {step.label}
                {step.state === 'current' && (
                  <span className="ml-2 text-[11px] font-bold px-2 py-[2px] rounded-full bg-pink-light text-pink-dark align-middle">
                    Current stage
                  </span>
                )}
              </p>
              <p className="text-muted text-[13px] mt-[2px]">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
