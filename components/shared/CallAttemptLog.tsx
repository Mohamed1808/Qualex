'use client'

import { useState } from 'react'
import type { CallAttempt, CallOutcome } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { logCallAttempt, confirmCallAttempt } from '@/actions/callAttempts'

interface CallAttemptLogProps {
  leadId: string
  stage: 'telesales' | 'direct_sales'
  attempts: CallAttempt[]
  onUpdate?: () => void
}

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  answered: 'Answered',
  no_answer: 'No Answer',
  callback_scheduled: 'Callback Scheduled',
}

const OUTCOME_COLORS: Record<CallOutcome, string> = {
  answered: '#22C55E',
  no_answer: '#F26161',
  callback_scheduled: '#F59E0B',
}

export default function CallAttemptLog({ leadId, stage, attempts, onUpdate }: CallAttemptLogProps) {
  const [logging, setLogging] = useState<number | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome>('answered')
  const [callbackAt, setCallbackAt] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [confirming, setConfirming] = useState(false)
  const [attemptConfirmed, setAttemptConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const nextAttemptNumber = attempts.length + 1
  const maxAttempts = 3
  const canLog = nextAttemptNumber <= maxAttempts

  // For attempt 3, agent must confirm attempt 2 first
  const attempt2 = attempts.find((a) => a.attempt_number === 2)
  const attempt2NeedsConfirm = attempt2 && !attempt2.agent_confirmed_call
  const requiresConfirm = nextAttemptNumber === 3 && attempt2NeedsConfirm

  async function handleConfirmAttempt2() {
    if (!attempt2) return
    setConfirming(true)
    try {
      const result = await confirmCallAttempt(attempt2.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Attempt 2 confirmed')
        onUpdate?.()
      }
    } catch {
      toast.error('Failed to confirm attempt')
    } finally {
      setConfirming(false)
    }
  }

  async function handleLogCall() {
    setSubmitting(true)
    try {
      const result = await logCallAttempt(
        leadId,
        stage,
        selectedOutcome,
        selectedOutcome === 'callback_scheduled' && callbackAt ? callbackAt : undefined,
        notes || undefined
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Attempt ${nextAttemptNumber} logged`)
        setLogging(null)
        setNotes('')
        setCallbackAt('')
        setSelectedOutcome('answered')
        setAttemptConfirmed(false)
        onUpdate?.()
      }
    } catch {
      toast.error('Failed to log call attempt')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-medium text-[#9CA3AF]">Call Attempts</h4>
        <span className="text-xs text-[#6B7280]">{attempts.length}/{maxAttempts}</span>
      </div>

      {/* Existing attempts */}
      {attempts.length === 0 && (
        <p className="text-xs text-[#4B5563] italic">No call attempts logged yet.</p>
      )}

      {attempts.map((attempt) => (
        <div
          key={attempt.id}
          className="bg-[#1c1c22] border border-[#2a2a2a] rounded-lg p-3 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {attempt.attempt_number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{
                    color: OUTCOME_COLORS[attempt.outcome],
                    backgroundColor: `${OUTCOME_COLORS[attempt.outcome]}15`,
                  }}
                >
                  {OUTCOME_LABELS[attempt.outcome]}
                </span>
                {!attempt.agent_confirmed_call && (
                  <span className="text-[10px] text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
                    Unconfirmed
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-1">
                {format(parseISO(attempt.called_at), 'MMM d, h:mm a')}
              </p>
              {attempt.callback_at && (
                <p className="text-xs text-[#F59E0B] mt-0.5">
                  Callback: {format(parseISO(attempt.callback_at), 'MMM d, h:mm a')}
                </p>
              )}
              {attempt.notes && (
                <p className="text-xs text-[#9CA3AF] mt-1 italic">{attempt.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Confirm attempt 2 before logging attempt 3 */}
      {requiresConfirm && !attemptConfirmed && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg p-3">
          <p className="text-xs text-[#F59E0B] mb-2">
            You must confirm that Attempt 2 was made before logging Attempt 3.
          </p>
          <button
            onClick={handleConfirmAttempt2}
            disabled={confirming}
            className="text-xs bg-[#F59E0B] text-black font-medium px-3 py-1.5 rounded-lg hover:bg-[#D97706] disabled:opacity-50 transition-colors"
          >
            {confirming ? 'Confirming…' : 'Confirm Attempt 2 Was Made'}
          </button>
        </div>
      )}

      {/* Log new attempt */}
      {canLog && (!requiresConfirm || attempt2?.agent_confirmed_call) && (
        <div>
          {logging === null ? (
            <button
              onClick={() => setLogging(nextAttemptNumber)}
              className="w-full text-sm text-[#3B82F6] border border-[#3B82F6]/30 bg-[#3B82F6]/5 hover:bg-[#3B82F6]/10 rounded-lg px-3 py-2 transition-colors font-medium"
            >
              + Log Attempt {nextAttemptNumber}
            </button>
          ) : (
            <div className="bg-[#1c1c22] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-white">Attempt {nextAttemptNumber}</p>

              {/* Outcome */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Outcome</label>
                <select
                  value={selectedOutcome}
                  onChange={(e) => setSelectedOutcome(e.target.value as CallOutcome)}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                >
                  <option value="answered">Answered</option>
                  <option value="no_answer">No Answer</option>
                  <option value="callback_scheduled">Callback Scheduled</option>
                </select>
              </div>

              {/* Callback datetime */}
              {selectedOutcome === 'callback_scheduled' && (
                <div>
                  <label className="text-xs text-[#9CA3AF] mb-1 block">Callback Date & Time</label>
                  <input
                    type="datetime-local"
                    value={callbackAt}
                    onChange={(e) => setCallbackAt(e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                  placeholder="Add notes…"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleLogCall}
                  disabled={submitting}
                  className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
                >
                  {submitting ? 'Saving…' : 'Save Attempt'}
                </button>
                <button
                  onClick={() => setLogging(null)}
                  className="px-3 py-2 text-sm text-[#6B7280] hover:text-white border border-[#2a2a2a] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!canLog && (
        <p className="text-xs text-[#4B5563] italic text-center py-2">
          Maximum 3 call attempts reached.
        </p>
      )}
    </div>
  )
}
