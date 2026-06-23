'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ConfigOccupation } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface OccupationConfigProps {
  occupations: ConfigOccupation[]
}

export default function OccupationConfig({ occupations: initial }: OccupationConfigProps) {
  const router = useRouter()
  const [occupations, setOccupations] = useState<ConfigOccupation[]>(initial)
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleAdd() {
    if (!newLabel.trim()) return
    setAdding(true)
    try {
      const maxOrder = Math.max(...occupations.map((o) => o.sort_order), 0)
      const { data, error } = await supabase
        .from('config_occupations')
        .insert({ label: newLabel.trim(), sort_order: maxOrder + 1, is_active: true })
        .select()
        .single()
      if (error) {
        toast.error(error.message)
      } else {
        setOccupations((prev) => [...prev, data])
        setNewLabel('')
        toast.success('Occupation added')
      }
    } finally {
      setAdding(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setSavingId(id)
    const { error } = await supabase
      .from('config_occupations')
      .update({ is_active: !current })
      .eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      setOccupations((prev) =>
        prev.map((o) => (o.id === id ? { ...o, is_active: !current } : o))
      )
    }
    setSavingId(null)
  }

  async function moveUp(index: number) {
    if (index === 0) return
    const newList = [...occupations]
    const [a, b] = [newList[index - 1], newList[index]]
    newList[index - 1] = { ...b, sort_order: a.sort_order }
    newList[index] = { ...a, sort_order: b.sort_order }
    setOccupations(newList)

    // Persist
    await supabase
      .from('config_occupations')
      .update({ sort_order: newList[index - 1].sort_order })
      .eq('id', newList[index - 1].id)
    await supabase
      .from('config_occupations')
      .update({ sort_order: newList[index].sort_order })
      .eq('id', newList[index].id)
  }

  async function moveDown(index: number) {
    if (index === occupations.length - 1) return
    const newList = [...occupations]
    const [a, b] = [newList[index], newList[index + 1]]
    newList[index] = { ...b, sort_order: a.sort_order }
    newList[index + 1] = { ...a, sort_order: b.sort_order }
    setOccupations(newList)

    await supabase
      .from('config_occupations')
      .update({ sort_order: newList[index].sort_order })
      .eq('id', newList[index].id)
    await supabase
      .from('config_occupations')
      .update({ sort_order: newList[index + 1].sort_order })
      .eq('id', newList[index + 1].id)
  }

  async function updateLabel(id: string, label: string) {
    setSavingId(id)
    const { error } = await supabase
      .from('config_occupations')
      .update({ label })
      .eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      setOccupations((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)))
      toast.success('Label updated')
    }
    setSavingId(null)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Occupation Configuration</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">
          Manage the list of occupations shown in qualification forms
        </p>
      </div>

      {/* Add new */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <p className="text-sm font-medium text-white mb-3">Add New Occupation</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Pharmacist"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newLabel.trim()}
            className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {adding ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {/* Occupation list */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a2a2a] text-xs text-[#6B7280] font-semibold uppercase tracking-wide">
          {occupations.length} occupations
        </div>
        <div className="divide-y divide-[#2a2a2a]">
          {occupations.map((occ, idx) => (
            <div key={occ.id} className="flex items-center gap-3 px-4 py-3">
              {/* Order buttons */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="text-[#4B5563] hover:text-white disabled:opacity-20 transition-colors text-xs leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === occupations.length - 1}
                  className="text-[#4B5563] hover:text-white disabled:opacity-20 transition-colors text-xs leading-none"
                >
                  ▼
                </button>
              </div>

              <span className="text-xs text-[#4B5563] w-5 flex-shrink-0">{idx + 1}</span>

              {/* Editable label */}
              <input
                defaultValue={occ.label}
                onBlur={(e) => {
                  if (e.target.value !== occ.label) {
                    updateLabel(occ.id, e.target.value)
                  }
                }}
                className="flex-1 bg-transparent text-white text-sm focus:outline-none focus:bg-[#1c1c22] rounded px-2 py-0.5 transition-colors"
              />

              {/* Active toggle */}
              <button
                onClick={() => toggleActive(occ.id, occ.is_active)}
                disabled={savingId === occ.id}
                className={`text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50 flex-shrink-0 ${
                  occ.is_active
                    ? 'text-[#22C55E] bg-[#22C55E]/10 hover:bg-[#22C55E]/20'
                    : 'text-[#6B7280] bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                }`}
              >
                {occ.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
