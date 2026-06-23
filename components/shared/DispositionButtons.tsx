'use client'

import { useState } from 'react'
import type { LeadStage, TeleDisposition, DSDisposition } from '@/types/database'
import { isTerminalStage } from '@/lib/assignment'
import { toast } from 'sonner'

type Disposition = TeleDisposition | DSDisposition

interface DispositionButtonsProps {
  leadId: string
  currentStage: LeadStage
  attemptCount: number
  onDispose: (disposition: Disposition, notes: string) => Promise<{ error?: string }>
  disabled?: boolean
}

interface DispositionOption {
  value: Disposition
  label: string
  color: string
  bg: string
  border: string
  description: string
  requiresAttempts?: number
}

const DISPOSITIONS: DispositionOption[] = [
  {
    value: 'qualified',
    label: 'Qualified',
    color: '#22C55E',
    bg: '#22C55E15',
    border: '#22C55E40',
    description: 'Customer is eligible and interested',
  },
  {
    value: 'unqualified',
    label: 'Unqualified',
    color: '#F26161',
    bg: '#F2616115',
    border: '#F2616140',
    description: 'Customer does not meet criteria',
  },
  {
    value: 'no_answer',
    label: 'No Answer',
    color: '#F59E0B',
    bg: '#F59E0B15',
    border: '#F59E0B40',
    description: 'Could not reach customer',
  },
  {
    value: 'retired',
    label: 'Retired',
    color: '#6B7280',
    bg: '#6B728015',
    border: '#6B728040',
    description: 'Customer requested not to be contacted',
  },
  {
    value: 'terminated',
    label: 'Terminated',
    color: '#EF4444',
    bg: '#EF444415',
    border: '#EF444440',
    description: 'After 3 failed contact attempts',
    requiresAttempts: 3,
  },
]

export default function DispositionButtons({
  leadId,
  currentStage,
  attemptCount,
  onDispose,
  disabled = false,
}: DispositionButtonsProps) {
  const [selected, setSelected] = useState<Disposition | null>(null)
  const [notes, setNotes] = useState('')
  const [unqualReason, setUnqualReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isTerminal = isTerminalStage(currentStage)
  const isDisabled = disabled || isTerminal

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    try {
      const finalNotes = selected === 'unqualified' ? `${unqualReason}: ${notes}` : notes
      const result = await onDispose(selected, finalNotes)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Lead marked as ${selected}`)
        setSelected(null)
        setNotes('')
        setUnqualReason('')
      }
    } catch {
      toast.error('Failed to update disposition')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleDispositions = DISPOSITIONS.filter((d) => {
    if (d.value === 'terminated') return attemptCount >= 3
    return true
  })

  if (isTerminal) {
    return (
      <div className="bg-[#1c1c22] border border-[#2a2a2a] rounded-lg p-4 text-center">
        <p className="text-sm text-[#6B7280]">
          Lead is in a terminal stage:{' '}
          <span className="text-white font-medium capitalize">
            {currentStage.replace(/_/g, ' ')}
          </span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#9CA3AF]">Set Disposition</p>

      {/* Buttons grid */}
      <div className="grid grid-cols-2 gap-2">
        {visibleDispositions.map((d) => {
          const isSelected = selected === d.value
          return (
            <button
              key={d.value}
              onClick={() => setSelected(isSelected ? null : d.value)}
              disabled={isDisabled}
              className="text-left p-3 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isSelected ? d.bg : 'transparent',
                borderColor: isSelected ? d.border : '#2a2a2a',
                color: isSelected ? d.color : '#9CA3AF',
              }}
            >
              <p className="text-sm font-medium">{d.label}</p>
              <p className="text-xs opacity-70 mt-0.5">{d.description}</p>
            </button>
          )
        })}
      </div>

      {/* Notes form when a disposition is selected */}
      {selected && (
        <div className="bg-[#1c1c22] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
          {selected === 'unqualified' && (
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Reason for disqualification</label>
              <select
                value={unqualReason}
                onChange={(e) => setUnqualReason(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#F26161]"
              >
                <option value="">Select reason…</option>
                <option value="income_too_low">Income Too Low</option>
                <option value="age_not_eligible">Age Not Eligible</option>
                <option value="employment_type">Employment Type Not Covered</option>
                <option value="no_down_payment">No Down Payment</option>
                <option value="bad_credit">Bad Credit History</option>
                <option value="not_interested">Not Interested Anymore</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-[#9CA3AF] mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              placeholder={`Notes about this ${selected} disposition…`}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || (selected === 'unqualified' && !unqualReason)}
              className="flex-1 text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
              style={{
                backgroundColor:
                  DISPOSITIONS.find((d) => d.value === selected)?.color ?? '#3B82F6',
                color: '#000',
              }}
            >
              {submitting ? 'Saving…' : `Confirm: ${selected}`}
            </button>
            <button
              onClick={() => { setSelected(null); setNotes(''); setUnqualReason('') }}
              className="px-3 py-2 text-sm text-[#6B7280] hover:text-white border border-[#2a2a2a] rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
