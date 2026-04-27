import { formatCurrent, formatFrequency, formatPower, formatVoltage } from '../../utils/formatters'

export default function PowerQuality({ readings }) {
  if (!readings) return <div className="text-textSecondary">No readings available</div>

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {readings.voltage && (
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Voltage</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatVoltage(readings.voltage)}</p>
        </div>
      )}
      {readings.current && (
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Current</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatCurrent(readings.current)}</p>
        </div>
      )}
      {readings.power && (
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Power</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatPower(readings.power)}</p>
        </div>
      )}
      {readings.frequency && (
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Frequency</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatFrequency(readings.frequency)}</p>
        </div>
      )}
    </div>
  )
}
