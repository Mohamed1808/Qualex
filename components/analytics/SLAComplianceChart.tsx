'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface SLADataPoint {
  date: string
  telesales: number
  directSales: number
}

interface SLAComplianceChartProps {
  data: SLADataPoint[]
}

export default function SLAComplianceChart({ data }: SLAComplianceChartProps) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">SLA Compliance Rate (%)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1c1c22',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#f0f0f0',
            }}
            formatter={(value) => [`${value}%`]}
          />
          <Legend
            wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
          />
          <Line
            type="monotone"
            dataKey="telesales"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Telesales"
          />
          <Line
            type="monotone"
            dataKey="directSales"
            stroke="#14B8A6"
            strokeWidth={2}
            dot={false}
            name="Direct Sales"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
