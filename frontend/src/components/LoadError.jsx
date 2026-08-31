import { CONNECTION_ERROR_MESSAGE } from '../api/index.js'

/**
 * Error banner for a failed request.
 *
 * The "check your connection" advice is only shown when the failure really was
 * a transport error. A refused action — a blood-group mismatch, an invalid
 * status change — already explains itself, and telling someone to check their
 * connection on top of that is just noise.
 */
export default function LoadError({ message, onRetry }) {
  if (!message) return null

  const isConnectionProblem = message.includes(CONNECTION_ERROR_MESSAGE)

  return (
    <div className="rounded-[14px] border border-[#d5233f] bg-[#ffe1e1] px-5 py-4 mb-6">
      <p className="text-sm font-bold text-[#d5233f]">{message}</p>
      {isConnectionProblem && (
        <p className="text-[#d5233f] text-[13px] mt-1">
          Check your connection and try again. If this keeps happening, sign out and back in.
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[13px] font-semibold bg-white text-[#d5233f] border border-[#d5233f] mt-3"
        >
          Retry
        </button>
      )}
    </div>
  )
}
