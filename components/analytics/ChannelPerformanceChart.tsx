'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface ChannelDataPoint {
  channel: string
  leads: number
  qualificationRate: number
  duplicateRate: number
}

interface ChannelPerformanceChartProps {
  data: ChannelDataPoint[]
}

export default function ChannelPerformanceChart({ data }: ChannelPerformanceChartProps) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Channel Performance</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="channel"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1c22',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#f0f0f0',
            }}
          />
          <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }} />
          <Bar dataKey="leads" name="Total Leads" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="qualificationRate" name="Qual. Rate %" fill="#22C55E" radius={[4, 4, 0, 0]} />
          <Bar dataKey="duplicateRate" name="Dup. Rate %" fill="#F59E0B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
