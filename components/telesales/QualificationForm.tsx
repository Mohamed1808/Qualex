'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { Lead, CallAttempt, ConfigOccupation } from '@/types/database'
import ChannelBadge from '@/components/shared/ChannelBadge'
import DuplicateBanner from '@/components/shared/DuplicateBanner'
import SLATimer from '@/components/shared/SLATimer'
import CallAttemptLog from '@/components/shared/CallAttemptLog'
import DispositionButtons from '@/components/shared/DispositionButtons'
import { qualifyLead, updateLeadDisposition, updateQualificationFields } from '@/actions/leads'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const CAIRO_TZ = 'Africa/Cairo'

const qualSchema = z.object({
  salary_bracket: z.string().min(1, 'Required'),
  down_payment_bracket: z.string().min(1, 'Required'),
  financing_program: z.enum(['new_car', 'used_car', 'collateral']),
  car_source: z.enum(['dealer', 'individual_c2c', 'undecided']),
  knows_specific_car: z.boolean(),
  occupation: z.string().min(1, 'Required'),
  customer_national_id: z.string().optional(),
  tele_notes: z.string().optional(),
})

type QualFormData = z.infer<typeof qualSchema>

interface QualificationFormProps {
  lead: Lead
  initialAttempts: CallAttempt[]
  occupations: ConfigOccupation[]
  agentId: string
}

export default function QualificationForm({
  lead,
  initialAttempts,
  occupations,
  agentId,
}: QualificationFormProps) {
  const router = useRouter()
  const [attempts, setAttempts] = useState<CallAttempt[]>(initialAttempts)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [followUpAt, setFollowUpAt] = useState('')
  const [submittingQual, setSubmittingQual] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QualFormData>({
    resolver: zodResolver(qualSchema),
    defaultValues: {
      salary_bracket: lead.salary_bracket ?? '',
      down_payment_bracket: lead.down_payment_bracket ?? '',
      financing_program: lead.financing_program ?? 'new_car',
      car_source: lead.car_source ?? 'dealer',
      knows_specific_car: lead.knows_specific_car ?? false,
      occupation: lead.occupation ?? '',
      customer_national_id: lead.customer_national_id ?? '',
      tele_notes: lead.tele_notes ?? '',
    },
  })

  async function onQualify(data: QualFormData) {
    setSubmittingQual(true)
    try {
      const result = await qualifyLead(lead.id, {
        salary_bracket: data.salary_bracket,
        down_payment_bracket: data.down_payment_bracket,
        financing_program: data.financing_program,
        car_source: data.car_source,
        knows_specific_car: data.knows_specific_car,
        occupation: data.occupation,
        customer_national_id: data.customer_national_id,
        tele_notes: data.tele_notes,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Lead qualified and sent to Direct Sales!')
        router.push('/telesales/agent')
      }
    } catch {
      toast.error('Failed to qualify lead')
    } finally {
      setSubmittingQual(false)
    }
  }

  async function handleDispose(disposition: string, notes: string) {
    const result = await updateLeadDisposition(lead.id, disposition, notes, 'telesales')
    if (!result.error) {
      router.push('/telesales/agent')
    }
    return result
  }

  async function handleFollowUpSave() {
    if (!followUpAt) return
    const result = await updateQualificationFields(lead.id, { tele_follow_up_at: followUpAt })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Follow-up scheduled')
    }
  }

  function reloadAttempts() {
    // Trigger re-fetch via router refresh
    router.refresh()
  }

  return (
    <div className="min-h-full p-6 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push('/telesales/agent')}
        className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-white mb-5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Queue
      </button>

      {/* Duplicate warning */}
      {lead.is_duplicate && lead.channel_history.length > 0 && (
        <DuplicateBanner
          channelHistory={lead.channel_history}
          originalChannel={lead.channel}
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        {/* Section A: Lead Info */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Lead Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
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
              <p className="text-xs text-[#6B7280] mb-1">SLA</p>
              <SLATimer dueAt={lead.tele_sla_due_at} breached={lead.tele_sla_breached} />
            </div>
            {lead.requested_car_brand && (
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Requested Car</p>
                <p className="text-sm text-white">
                  {lead.requested_car_brand}
                  {lead.requested_car_year ? ` (${lead.requested_car_year})` : ''}
                </p>
              </div>
            )}
            {lead.source_campaign && (
              <div>
                <p className="text-xs text-[#6B7280] mb-1">Campaign</p>
                <p className="text-sm text-white">{lead.source_campaign}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section B: Call Attempts */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Call Attempts
          </h2>
          <CallAttemptLog
            leadId={lead.id}
            stage="telesales"
            attempts={attempts}
            onUpdate={reloadAttempts}
          />
        </div>

        {/* Section C: Qualification Fields */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Qualification Details
          </h2>
          <form id="qual-form" onSubmit={handleSubmit(onQualify)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Salary Bracket */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Monthly Salary Bracket</label>
                <select
                  {...register('salary_bracket')}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                >
                  <option value="">Select…</option>
                  <option value="below_3000">Below EGP 3,000</option>
                  <option value="3000_5000">EGP 3,000 – 5,000</option>
                  <option value="5000_10000">EGP 5,000 – 10,000</option>
                  <option value="10000_20000">EGP 10,000 – 20,000</option>
                  <option value="20000_plus">EGP 20,000+</option>
                </select>
                {errors.salary_bracket && (
                  <p className="text-[10px] text-[#F26161] mt-1">{errors.salary_bracket.message}</p>
                )}
              </div>

              {/* Down Payment */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Down Payment Bracket</label>
                <select
                  {...register('down_payment_bracket')}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                >
                  <option value="">Select…</option>
                  <option value="below_20pct">Below 20%</option>
                  <option value="20_30pct">20% – 30%</option>
                  <option value="30_50pct">30% – 50%</option>
                  <option value="above_50pct">Above 50%</option>
                </select>
                {errors.down_payment_bracket && (
                  <p className="text-[10px] text-[#F26161] mt-1">{errors.down_payment_bracket.message}</p>
                )}
              </div>

              {/* Financing Program */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Financing Program</label>
                <select
                  {...register('financing_program')}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                >
                  <option value="new_car">New Car</option>
                  <option value="used_car">Used Car</option>
                  <option value="collateral">Collateral</option>
                </select>
              </div>

              {/* Car Source */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Car Source</label>
                <select
                  {...register('car_source')}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                >
                  <option value="dealer">Dealer</option>
                  <option value="individual_c2c">Individual (C2C)</option>
                  <option value="undecided">Undecided</option>
                </select>
              </div>

              {/* Occupation */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">Occupation</label>
                <select
                  {...register('occupation')}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                >
                  <option value="">Select…</option>
                  {occupations.map((occ) => (
                    <option key={occ.id} value={occ.label}>
                      {occ.label}
                    </option>
                  ))}
                </select>
                {errors.occupation && (
                  <p className="text-[10px] text-[#F26161] mt-1">{errors.occupation.message}</p>
                )}
              </div>

              {/* National ID */}
              <div>
                <label className="text-xs text-[#9CA3AF] mb-1 block">National ID (optional)</label>
                <input
                  {...register('customer_national_id')}
                  type="text"
                  placeholder="14-digit national ID"
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
                />
              </div>
            </div>

            {/* Knows specific car */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('knows_specific_car')}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1c1c22] text-[#5757e6] focus:ring-[#5757e6]"
              />
              <span className="text-sm text-[#9CA3AF]">Customer has a specific car in mind</span>
            </label>

            {/* Notes */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Telesales Notes</label>
              <textarea
                {...register('tele_notes')}
                rows={3}
                placeholder="Any notes for the DS agent…"
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 resize-none placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
            </div>
          </form>
        </div>

        {/* Section D: Disposition */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide mb-4">
            Disposition
          </h2>
          <DispositionButtons
            leadId={lead.id}
            currentStage={lead.stage}
            attemptCount={attempts.length}
            onDispose={async (disposition, notes) => handleDispose(disposition, notes)}
          />

          {/* Qualify button */}
          <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
            <button
              type="submit"
              form="qual-form"
              disabled={submittingQual}
              className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 text-black font-semibold text-sm rounded-lg py-3 transition-colors"
            >
              {submittingQual ? 'Qualifying…' : '✅ Qualify & Send to Direct Sales'}
            </button>
          </div>
        </div>

        {/* Section E: Follow-up */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#9CA3AF] uppercase tracking-wide">
              Follow-up Scheduling
            </h2>
            <button
              onClick={() => setShowFollowUp(!showFollowUp)}
              className="text-xs text-[#5757e6] hover:text-[#7d7dee] transition-colors"
            >
              {showFollowUp ? 'Hide' : 'Schedule'}
            </button>
          </div>
          {lead.tele_follow_up_at && (
            <p className="text-xs text-[#F59E0B] mb-3">
              Current: {format(toZonedTime(new Date(lead.tele_follow_up_at), CAIRO_TZ), 'MMM d, h:mm a')} Cairo
            </p>
          )}
          {showFollowUp && (
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="flex-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
              <button
                onClick={handleFollowUpSave}
                className="px-4 py-2 bg-[#5757e6] text-white text-sm rounded-lg hover:bg-[#4444cc] transition-colors"
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
