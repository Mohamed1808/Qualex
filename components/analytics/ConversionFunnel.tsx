'use client'

import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
} from 'recharts'

interface ConversionFunnelProps {
  data: {
    captured: number
    tsReached: number
    tsQualified: number
    dsReached: number
    dsQualified: number
    creditSubmitted: number
    approved: number
  }
}

export default function ConversionFunnel({ data }: ConversionFunnelProps) {
  const funnelData = [
    { name: 'Captured', value: data.captured, fill: '#3B82F6' },
    { name: 'TS Reached', value: data.tsReached, fill: '#60A5FA' },
    { name: 'TS Qualified', value: data.tsQualified, fill: '#14B8A6' },
    { name: 'DS Reached', value: data.dsReached, fill: '#2DD4BF' },
    { name: 'DS Qualified', value: data.dsQualified, fill: '#22C55E' },
    { name: 'Credit Submitted', value: data.creditSubmitted, fill: '#F59E0B' },
    { name: 'Approved', value: data.approved, fill: '#22C55E' },
  ]

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Conversion Funnel</h3>
      <ResponsiveContainer width="100%" height={320}>
        <FunnelChart>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1c22',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#f0f0f0',
            }}
            formatter={(value) => [(value as number).toLocaleString()]}
          />
          <Funnel dataKey="value" data={funnelData} isAnimationActive>
            <LabelList
              position="right"
              fill="#9CA3AF"
              stroke="none"
              dataKey="name"
              style={{ fontSize: '12px' }}
            />
            <LabelList
              position="center"
              fill="#fff"
              stroke="none"
              dataKey="value"
              style={{ fontSize: '11px', fontWeight: 600 }}
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}
