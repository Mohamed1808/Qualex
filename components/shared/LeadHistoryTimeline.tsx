import { getStageLabel } from '@/lib/assignment'
import { format, parseISO } from 'date-fns'

interface HistoryRow {
  id: string
  from_stage: string | null
  to_stage: string
  changed_at: string
  note: string | null
  changed_by_profile?: { full_name: string; role: string } | null
}

interface LeadHistoryTimelineProps {
  history: HistoryRow[]
}

// Color coding per stage family — matches the rest of the app palette
function stageColor(stage: string): string {
  if (['approved'].includes(stage)) return '#22C55E'
  if (['rejected', 'unqualified', 'terminated', 'unreachable'].includes(stage)) return '#F26161'
  if (['retired'].includes(stage)) return '#F59E0B'
  if (['qualified', 'ds_assigned', 'ds_in_progress', 'id_collected', 'credit_submitted'].includes(stage))
    return '#14B8A6'
  return '#5757e6'
}

export default function LeadHistoryTimeline({ history }: LeadHistoryTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-1">Lead History</h3>
        <p className="text-xs text-[#6B7280]">No history recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Lead History</h3>
      <ol className="relative border-l border-[#2a2a2a] ml-2">
        {history.map((row) => {
          const color = stageColor(row.to_stage)
          return (
            <li key={row.id} className="mb-5 ml-5 last:mb-0">
              <span
                className="absolute -left-[7px] w-3.5 h-3.5 rounded-full border-2 border-[#161616]"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                {row.from_stage && (
                  <>
                    <span className="text-xs text-[#6B7280]">{getStageLabel(row.from_stage)}</span>
                    <span className="text-[#4B5563]">→</span>
                  </>
                )}
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded"
                  style={{ color, backgroundColor: `${color}1a` }}
                >
                  {getStageLabel(row.to_stage)}
                </span>
              </div>
              {row.note && <p className="text-xs text-[#9CA3AF] mt-1">{row.note}</p>}
              <p className="text-[11px] text-[#4B5563] mt-1">
                {format(parseISO(row.changed_at), 'MMM d, yyyy · HH:mm')}
                {row.changed_by_profile?.full_name
                  ? ` · ${row.changed_by_profile.full_name}`
                  : ' · System'}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
