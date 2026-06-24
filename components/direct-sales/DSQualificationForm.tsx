'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Lead, CallAttempt, ConfigOccupation } from '@/types/database'
import ChannelBadge from '@/components/shared/ChannelBadge'
import DuplicateBanner from '@/components/shared/DuplicateBanner'
import SLATimer from '@/components/shared/SLATimer'
import CallAttemptLog from '@/components/shared/CallAttemptLog'
import DispositionButtons from '@/components/shared/DispositionButtons'
import IDUpload from './IDUpload'
import { updateLeadDisposition, updateQualificationFields } from '@/actions/leads'

interface DSQualificationFormProps {
  lead: Lead
  tsAttempts: CallAttempt[]
  dsAttempts: CallAttempt[]
  occupations: ConfigOccupation[]
  agentId: string
}

export default function DSQualificationForm({
  lead,
  tsAttempts,
  dsAttempts,
  occupations,
  agentId,
}: DSQualificationFormProps) {
  const router = useRouter()
  const [dsAttemptsList, setDsAttemptsList] = useState(dsAttempts)
  // Keep attempts in sync after router.refresh() re-fetches the lead's attempts
  useEffect(() => {
    setDsAttemptsList(dsAttempts)
  }, [dsAttempts])
  const [dsNotes, setDsNotes] = useState(lead.ds_notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [followUpAt, setFollowUpAt] = useState('')

  async function handleDispose(disposition: string, notes: string) {
    const result = await updateLeadDisposition(lead.id, disposition, notes, 'direct_sales')
    if (!result.error) {
      router.push('/direct-sales/agent')
    }
    return result
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    const result = await updateQualificationFields(lead.id, { ds_notes: dsNotes })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Notes saved')
    }
    setSavingNotes(false)
  }

  async function handleIDUploaded(url: string) {
    await updateQualificationFields(lead.id, { id_document_url: url })
  }

  async function handleMarkIDCollected() {
    const result = await updateQualificationFields(lead.id, {})
    // Update stage to id_collected
    const { error } = await (await import('@/lib/supabase/client')).createClient()
      .from('leads')
      .update({ stage: 'id_collected' })
      .eq('id', lead.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Stage updated to ID Collected')
      router.refresh()
    }
  }

  async function handleSubmitCredit() {
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const { error } = await supabase
      .from('leads')
      .update({ stage: 'credit_submitted' })
      .eq('id', lead.id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Credit application submitted!')
      router.refresh()
    }
  }

  async function handleFollowUpSave() {
    if (!followUpAt) return
    const result = await updateQualificationFields(lead.id, { ds_follow_up_at: followUpAt })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Follow-up scheduled')
    }
  }

  return (
    <div className="min-h-full p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.push('/direct-sales/agent')}
        className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-white mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Queue
      </button>

      {lead.is_duplicate && lead.channel_history.length > 0 && (
        <DuplicateBanner
          channelHistory={lead.channel_history}
          originalChannel={lead.channel}
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        {/* Section A: Lead Info + Telesales Summary (read-only) */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Lead Information
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Name</p>
              <p className="text-sm text-white font-medium">{lead.name}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Phone</p>
              <p className="text-sm text-white font-mono">{lead.phone}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Channel</p>
              <ChannelBadge channel={lead.channel} />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] mb-1">DS SLA</p>
              <SLATimer dueAt={lead.ds_sla_due_at} breached={lead.ds_sla_breached} />
            </div>
          </div>

          {/* Telesales Qualification Summary */}
          <div className="border-t border-[#2a2a2a] pt-4">
            <p className="text-xs font-semibold text-[#14B8A6] uppercase tracking-wide mb-3">
              Telesales Summary
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Salary Bracket', value: lead.salary_bracket },
                { label: 'Down Payment', value: lead.down_payment_bracket },
                { label: 'Financing Program', value: lead.financing_program?.replace(/_/g, ' ') },
                { label: 'Car Source', value: lead.car_source?.replace(/_/g, ' ') },
                { label: 'Occupation', value: lead.occupation },
                { label: 'Knows Car?', value: lead.knows_specific_car ? 'Yes' : 'No' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[#6B7280]">{label}</p>
                  <p className="text-white capitalize">{value ?? '—'}</p>
                </div>
              ))}
            </div>
            {lead.tele_notes && (
              <div className="mt-3">
                <p className="text-[#6B7280] text-xs mb-1">Telesales Notes</p>
                <p className="text-[#9CA3AF] text-xs italic bg-[#1c1c22] rounded-lg p-2">
                  {lead.tele_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section B: DS Call Attempts */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            DS Call Attempts
          </h2>
          <CallAttemptLog
            leadId={lead.id}
            stage="direct_sales"
            attempts={dsAttemptsList}
            onUpdate={() => router.refresh()}
          />
        </div>

        {/* Section C: ID Upload */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Customer ID Documents
          </h2>
          <IDUpload
            leadId={lead.id}
            existingUrl={lead.id_document_url}
            onUpload={handleIDUploaded}
          />
          {lead.id_document_url && lead.stage === 'ds_in_progress' && (
            <button
              onClick={handleMarkIDCollected}
              className="mt-3 w-full bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 text-[#14B8A6] border border-[#14B8A6]/30 text-sm font-medium rounded-lg py-2 transition-colors"
            >
              ✅ Mark ID as Collected
            </button>
          )}
          {lead.stage === 'id_collected' && (
            <button
              onClick={handleSubmitCredit}
              className="mt-3 w-full bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold text-sm rounded-lg py-2 transition-colors"
            >
              📤 Submit Credit Application
            </button>
          )}
        </div>

        {/* Section D: DS Notes */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            DS Notes
          </h2>
          <textarea
            value={dsNotes}
            onChange={(e) => setDsNotes(e.target.value)}
            rows={4}
            className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
            placeholder="Notes for this lead…"
          />
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="mt-2 text-sm bg-[#14B8A6]/15 hover:bg-[#14B8A6]/25 text-[#14B8A6] border border-[#14B8A6]/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {savingNotes ? 'Saving…' : 'Save Notes'}
          </button>
        </div>

        {/* Section E: Disposition */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            DS Disposition
          </h2>
          <DispositionButtons
            leadId={lead.id}
            currentStage={lead.stage}
            attemptCount={dsAttemptsList.length}
            onDispose={async (disposition, notes) => handleDispose(disposition, notes)}
          />
        </div>

        {/* Section F: Follow-up */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide">
              Follow-up Scheduling
            </h2>
            <button
              onClick={() => setShowFollowUp(!showFollowUp)}
              className="text-xs text-[#14B8A6] hover:text-[#5EEAD4] transition-colors"
            >
              {showFollowUp ? 'Hide' : 'Schedule'}
            </button>
          </div>
          {showFollowUp && (
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
              />
              <button
                onClick={handleFollowUpSave}
                className="px-4 py-2 bg-[#14B8A6] text-black text-sm font-medium rounded-lg hover:bg-[#0D9488] transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
