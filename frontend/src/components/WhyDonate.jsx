import { Heart, Droplet, Clock } from 'lucide-react'

const reasons = [
  { icon: Heart, text: 'Every donation can save up to 3 lives', color: 'text-pink-dark fill-pink-light' },
  { icon: Droplet, text: 'Blood cannot be manufactured synthetically', color: 'text-red-500 fill-red-100' },
  { icon: Clock, text: 'Every second counts in critical emergencies', color: 'text-amber-500 fill-amber-100' },
]

export default function WhyDonate() {
  return (
    <section className="py-[72px] text-center">
      <div className="max-w-[1160px] mx-auto px-6">
        <h2 className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-ink mb-12">
          Why Donate <span className="text-pink">Blood</span>?
        </h2>
        <div className="flex gap-8 sm:gap-14 justify-center flex-wrap">
          {reasons.map((reason) => {
            const Icon = reason.icon
            return (
              <div className="max-w-[220px] flex flex-col items-center" key={reason.text}>
                <div className={`w-14 h-14 rounded-2xl bg-white border border-line shadow-xs flex items-center justify-center mb-4 ${reason.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{reason.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
