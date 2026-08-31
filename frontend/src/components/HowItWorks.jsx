const steps = ['Register', 'Request', 'Hospital', 'Get Help']

export default function HowItWorks() {
  return (
    <section className="pt-12 pb-[72px] text-center">
      <div className="max-w-[1160px] mx-auto px-6">
        <div className="flex justify-center gap-5 flex-wrap mb-[18px] max-[860px]:gap-[10px]">
          {steps.map((step) => (
            <span
              className="bg-[linear-gradient(135deg,#ffb3c6_0%,#f2467d_55%,#e0295f_100%)] text-white font-bold text-sm px-8 py-3 rounded-full shadow-[0_8px_20px_rgba(242,70,125,0.3)] max-[860px]:px-5 max-[860px]:py-[10px] max-[860px]:text-[13px]"
              key={step}
            >
              {step}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-center max-w-[620px] mx-auto max-[860px]:hidden">
          {steps.map((step, i) => (
            <div className="flex items-center flex-1 last:flex-none" key={step}>
              <span className="w-2 h-2 rounded-full border-2 border-pink shrink-0" />
              {i < steps.length - 1 && (
                <span className="flex-1 h-0 border-t-2 border-dotted border-pink mx-[6px]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
