import { formatTemp, formatHumidity } from '../../utils/formatters'

export default function TempSensor({ readings }) {
  if (!readings) return <div className="text-textSecondary">No readings available</div>

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <div className="metric-card">
        <p className="text-xs text-textSecondary mb-2">Temperature</p>
        <p className="font-mono text-2xl font-bold text-textPrimary">{formatTemp(readings.temperature)}</p>
        <p className="text-xs text-textSecondary mt-2">Environmental sensor</p>
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
