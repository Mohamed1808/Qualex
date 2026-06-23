'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface ScriptQualityDataPoint {
  reasonCode: string
  count: number
}

interface ScriptQualityChartProps {
  data: ScriptQualityDataPoint[]
}

export default function ScriptQualityChart({ data }: ScriptQualityChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.reasonCode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }))

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Script Quality — TS Leads Rejected at DS</h3>
      <p className="text-xs text-[#6B7280] mb-4">Top rejection reason codes from DS stage</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={formatted} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
            width={130}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1c22',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#f0f0f0',
            }}
            formatter={(value) => [value, 'Cases']}
          />
          <Bar dataKey="count" fill="#F26161" radius={[0, 4, 4, 0]} name="Cases" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
