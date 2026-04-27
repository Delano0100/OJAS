import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function LiveChart({ data, dataKey = 'power', name = 'Power', color = '#3B82F6' }) {
  return (
    <div className="section-card">
      <h3 className="mb-4 font-semibold text-textPrimary">{name} Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
          <XAxis dataKey="time" stroke="#64748B" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111118',
              border: '1px solid #1E1E2E',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#F1F5F9' }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
