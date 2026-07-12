'use client'

interface FunnelStep {
  label: string
  value: number
}

/** A true stepped funnel: each stage narrower than the last, with drop-off %. */
export default function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value))
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const widthPct = Math.max(8, (s.value / max) * 100)
        const prev = i > 0 ? steps[i - 1].value : null
        const dropPct = prev && prev > 0 ? Math.round(((prev - s.value) / prev) * 100) : null
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#4B5563]">{s.label}</span>
              <span className="text-xs font-semibold text-[#111827]">
                {s.value}
                {dropPct !== null && dropPct > 0 && (
                  <span className="ml-1.5 text-[10px] font-normal text-[#F26161]">−{dropPct}%</span>
                )}
              </span>
            </div>
            <div className="flex justify-center">
              <div
                className="h-7 rounded-md transition-all"
                style={{
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, #5757e6, #7d7dee)`,
                  opacity: 0.35 + (0.65 * (steps.length - i)) / steps.length,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
