import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function HistoryChart({ data, dataKey = 'consumption', name = 'Consumption', color = '#22C55E' }) {
  return (
    <div className="section-card">
      <h3 className="mb-4 font-semibold text-textPrimary">{name} History</h3>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data || []}>
          <defs>
            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
          <XAxis dataKey="day" stroke="#64748B" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111118',
              border: '1px solid #1E1E2E',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F1F5F9' }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorArea)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
