import { formatHumidity, formatTemp } from '../../utils/formatters'

export default function EnvSensor({ readings }) {
  if (!readings) return <div className="text-textSecondary">No readings available</div>

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <div className="metric-card">
        <p className="text-xs text-textSecondary mb-2">Temperature</p>
        <p className="font-mono text-2xl font-bold text-textPrimary">{formatTemp(readings.temperature)}</p>
      </div>
      {readings.humidity && (
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Humidity</p>
          <p className="font-mono text-2xl font-bold text-textPrimary">{formatHumidity(readings.humidity)}</p>
        </div>
      )}
    </div>
  )
}
