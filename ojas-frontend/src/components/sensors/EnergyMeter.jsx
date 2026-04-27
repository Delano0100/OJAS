import { formatCurrent, formatEnergy, formatFrequency, formatPower, formatPowerFactor, formatVoltage } from '../../utils/formatters'

export default function EnergyMeter({ readings }) {
  if (!readings) return <div className="text-textSecondary">No readings available</div>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Voltage</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatVoltage(readings?.voltage)}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Current</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatCurrent(readings?.current)}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Power</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatPower(readings?.power)}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Energy (Total)</p>
          <p className="font-mono text-xl font-bold text-success">{formatEnergy(readings?.energy)}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Frequency</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatFrequency(readings?.frequency)}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs text-textSecondary mb-2">Power Factor</p>
          <p className="font-mono text-xl font-bold text-textPrimary">{formatPowerFactor(readings?.powerFactor)}</p>
        </div>
      </div>
    </div>
  )
}
