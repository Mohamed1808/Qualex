'use client'

import { useState } from 'react'
import type { CallAttempt, CallOutcome } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { logCallAttempt } from '@/actions/callAttempts'

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
  const [submitting, setSubmitting] = useState(false)

  const nextAttemptNumber = attempts.length + 1

  // Trailing streak of consecutive "no answer" outcomes. A callback or an
  // answered call resets it — the customer is still reachable, so attempts
  // continue until they decide. Three consecutive no-answers locks the lead.
  const ordered = [...attempts].sort((a, b) => a.attempt_number - b.attempt_number)
  let noAnswerStreak = 0
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i].outcome === 'no_answer') noAnswerStreak++
    else break
  }
  const NO_ANSWER_LIMIT = 3
  const canLog = noAnswerStreak < NO_ANSWER_LIMIT

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
        if ((result as { unreachable?: boolean }).unreachable) {
          toast.warning('Customer marked unreachable after 3 consecutive no-answers.')
        }
        setLogging(null)
        setNotes('')
        setCallbackAt('')
        setSelectedOutcome('answered')
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
        <span className="text-xs text-[#6B7280]">
          {attempts.length} logged
          {noAnswerStreak > 0 && (
            <span className="text-[#F26161]"> · {noAnswerStreak}/{NO_ANSWER_LIMIT} no-answer</span>
          )}
        </span>
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

      {/* Log new attempt */}
      {canLog && (
        <div>
          {logging === null ? (
            <button
              onClick={() => setLogging(nextAttemptNumber)}
              className="w-full text-sm text-[#5757e6] border border-[#5757e6]/30 bg-[#5757e6]/5 hover:bg-[#5757e6]/10 rounded-lg px-3 py-2 transition-colors font-medium"
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
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
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
                    className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
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
                  className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                  placeholder="Add notes…"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleLogCall}
                  disabled={submitting}
                  className="flex-1 bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-2 transition-colors"
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
        <div className="bg-[#F26161]/10 border border-[#F26161]/30 rounded-lg p-3 text-center">
          <p className="text-xs text-[#F26161] font-medium">
            Customer unreachable — 3 consecutive no-answers.
          </p>
          <p className="text-[10px] text-[#6B7280] mt-1">
            The lead has been closed. A callback at any point would have kept it open.
          </p>
        </div>
      )}
    </div>
  )
}
