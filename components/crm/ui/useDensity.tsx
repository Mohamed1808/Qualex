'use client'

import { useEffect, useState } from 'react'

export type Density = 'comfortable' | 'compact'

const KEY = 'qualex-crm-density'

/** Persisted table row density, shared across the whole app. */
export function useDensity() {
  const [density, setDensity] = useState<Density>('comfortable')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (window.localStorage.getItem(KEY) as Density | null) : null
    if (saved) setDensity(saved)
  }, [])

  function set(d: Density) {
    setDensity(d)
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, d)
  }

  const rowPad = density === 'compact' ? 'py-1.5' : 'py-3'
  return { density, setDensity: set, rowPad }
}

export function DensityToggle({ density, onChange }: { density: Density; onChange: (d: Density) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-[#f3f4f6] border border-[#e5e7eb] rounded-lg p-0.5">
      {(['comfortable', 'compact'] as const).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          title={d === 'comfortable' ? 'Comfortable rows' : 'Compact rows'}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors capitalize ${
            density === d ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          {d === 'comfortable' ? '☰ Comfortable' : '≡ Compact'}
        </button>
      ))}
    </div>
  )
}
