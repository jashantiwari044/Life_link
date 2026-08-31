export const inputClass =
  'border rounded-[10px] px-[14px] py-[11px] text-sm bg-white text-ink focus:outline-none focus:border-pink'
export const disabledInputClass =
  'border border-line rounded-[10px] px-[14px] py-[11px] text-sm bg-[#f5f5f5] text-muted cursor-not-allowed opacity-70'
export const labelClass = 'text-[13px] font-semibold text-ink'
export const errorClass = 'text-pink-dark text-xs font-semibold'

export function inputCls(errors, name) {
  return `${inputClass} ${errors[name] ? 'border-pink-dark' : 'border-line'}`
}
