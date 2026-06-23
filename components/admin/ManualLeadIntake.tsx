'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Lead, LeadChannel } from '@/types/database'
import { createLead } from '@/actions/leads'
import ChannelBadge from '@/components/shared/ChannelBadge'
import { format, parseISO } from 'date-fns'
import { getStageLabel } from '@/lib/assignment'

const intakeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  channel: z.enum(['whatsapp', 'meta', 'website', 'app', 'call_center']),
  requested_car_brand: z.string().optional(),
  requested_car_year: z.string().optional(),
  source_campaign: z.string().optional(),
})

type IntakeFormData = z.infer<typeof intakeSchema>

interface ManualLeadIntakeProps {
  recentLeads: Lead[]
}

export default function ManualLeadIntake({ recentLeads }: ManualLeadIntakeProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { channel: 'call_center' },
  })

  async function onSubmit(data: IntakeFormData) {
    setSubmitting(true)
    try {
      const result = await createLead({
        name: data.name,
        phone: data.phone,
        channel: data.channel,
        requested_car_brand: data.requested_car_brand || undefined,
        requested_car_year: data.requested_car_year ? parseInt(data.requested_car_year, 10) : undefined,
        source_campaign: data.source_campaign || undefined,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Lead created successfully!')
        reset()
        router.refresh()
      }
    } catch {
      toast.error('Failed to create lead')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Manual Lead Intake</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">Create a new lead manually</p>
      </div>

      {/* Intake Form */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Full Name *</label>
              <input
                {...register('name')}
                type="text"
                placeholder="Customer full name"
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
              {errors.name && (
                <p className="text-[10px] text-[#F26161] mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Phone Number *</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="01XXXXXXXXX"
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
              {errors.phone && (
                <p className="text-[10px] text-[#F26161] mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Channel */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Channel *</label>
              <select
                {...register('channel')}
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              >
                <option value="call_center">Call Center</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="meta">Meta</option>
                <option value="website">Website</option>
                <option value="app">App</option>
              </select>
            </div>

            {/* Car Brand */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Car Brand (optional)</label>
              <input
                {...register('requested_car_brand')}
                type="text"
                placeholder="e.g. Toyota, BMW"
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
            </div>

            {/* Car Year */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Car Year (optional)</label>
              <input
                {...register('requested_car_year')}
                type="number"
                placeholder="e.g. 2024"
                min={2000}
                max={2030}
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
            </div>

            {/* Campaign */}
            <div>
              <label className="text-xs text-[#9CA3AF] mb-1 block">Campaign (optional)</label>
              <input
                {...register('source_campaign')}
                type="text"
                placeholder="e.g. Summer2025"
                className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#5757e6]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white font-semibold text-sm rounded-lg py-3 transition-colors"
          >
            {submitting ? 'Creating Lead…' : '➕ Create Lead'}
          </button>
        </form>
      </div>

      {/* Recent Leads Table */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Recent Leads</h2>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {['Name', 'Phone', 'Channel', 'Stage', 'Agent', 'Created'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#4B5563] text-sm">
                      No leads yet
                    </td>
                  </tr>
                ) : (
                  recentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-[#1c1c22]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-medium">{lead.name}</span>
                          {lead.is_duplicate && (
                            <span className="text-[10px] bg-[#F59E0B]/15 text-[#F59E0B] px-1.5 py-0.5 rounded">
                              DUP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF] font-mono text-xs">{lead.phone}</td>
                      <td className="px-4 py-3">
                        <ChannelBadge channel={lead.channel} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[#9CA3AF] bg-[#2a2a2a] px-2 py-1 rounded">
                          {getStageLabel(lead.stage)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-xs">
                        {(lead as { profiles_telesales?: { full_name: string } }).profiles_telesales
                          ?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#6B7280] text-xs">
                        {format(parseISO(lead.created_at), 'MMM d, HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
