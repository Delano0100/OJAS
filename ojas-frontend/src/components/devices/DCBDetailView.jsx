import { formatCurrent, formatPower, formatTemp, formatVoltage } from '../../utils/formatters'

export default function DCBDetailView({ device }) {
  if (!device || !device.subDevices) {
    return <div>No sub-devices found</div>
  }

  return (
    <div className="space-y-4">
      {device.subDevices.map((subDevice) => (
        <div key={subDevice.id} className="section-card">
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${
                subDevice.status === 'online' ? 'bg-success' :
                subDevice.status === 'warning' ? 'bg-warning' :
                'bg-danger'
              }`}></span>
              <h3 className="font-semibold text-textPrimary">{subDevice.name}</h3>
              <span className="text-xs text-textSecondary uppercase">{subDevice.type}</span>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {subDevice.readings.voltage && (
              <div>
                <p className="text-xs text-textSecondary mb-1">Voltage</p>
                <p className="font-mono text-lg text-textPrimary">{formatVoltage(subDevice.readings.voltage)}</p>
              </div>
            )}
            {subDevice.readings.current && (
              <div>
                <p className="text-xs text-textSecondary mb-1">Current</p>
                <p className="font-mono text-lg text-textPrimary">{formatCurrent(subDevice.readings.current)}</p>
              </div>
            )}
            {subDevice.readings.power && (
              <div>
                <p className="text-xs text-textSecondary mb-1">Power</p>
                <p className="font-mono text-lg text-textPrimary">{formatPower(subDevice.readings.power)}</p>
              </div>
            )}
            {subDevice.readings.temperature && (
              <div>
                <p className="text-xs text-textSecondary mb-1">Temperature</p>
                <p className="font-mono text-lg text-textPrimary">{formatTemp(subDevice.readings.temperature)}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
