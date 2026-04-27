import { formatLoad, formatPower } from '../../utils/formatters'

export default function LoadMonitor({ readings }) {
  if (!readings) return <div className="text-textSecondary">No readings available</div>

  const load = readings.load || 0
  const loadColor = load >= 90 ? 'text-danger' : load >= 70 ? 'text-warning' : 'text-success'

  return (
    <div className="space-y-4">
      <div className="metric-card">
        <p className="text-xs text-textSecondary mb-4">Load Status</p>
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={`font-mono text-4xl font-bold ${loadColor}`}>{formatLoad(load)}</span>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-border/50">
            <div
              className={`h-full rounded-full transition-all ${
                load >= 90 ? 'bg-danger' : load >= 70 ? 'bg-warning' : 'bg-success'
              }`}
              style={{ width: `${load}%` }}
            ></div>
          </div>
        </div>
        {readings.power && (
          <p className="text-sm text-textSecondary">Power: {formatPower(readings.power)}</p>
        )}
      </div>
    </div>
  )
}
