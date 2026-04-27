import { useDevices } from '../hooks/useDevices'
import HistoryChart from '../components/charts/HistoryChart'
import LiveChart from '../components/charts/LiveChart'
import Loader from '../components/common/Loader'
import { MOCK_ENERGY_TREND, MOCK_POWER_TREND, ENERGY_RATE_PER_KWH } from '../utils/constants'

export default function Energy() {
  const { devices, loading } = useDevices()

  if (loading) return <Loader />

  // Calculate total energy consumption
  const totalEnergy = devices
    .filter((d) => d.readings?.energy)
    .reduce((sum, d) => sum + d.readings.energy, 0)

  const totalCost = (totalEnergy * ENERGY_RATE_PER_KWH).toFixed(2)
  const totalPower = devices
    .filter((d) => d.readings?.power)
    .reduce((sum, d) => sum + d.readings.power, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-textPrimary mb-1">Energy Analytics</h1>
        <p className="text-textSecondary">Real-time consumption and cost tracking</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="section-card">
          <p className="text-sm text-textSecondary mb-2">Total Energy (Cumulative)</p>
          <p className="font-mono text-3xl font-bold text-success mb-1">{totalEnergy.toFixed(1)} kWh</p>
          <p className="text-xs text-textSecondary">All connected meters</p>
        </div>

        <div className="section-card">
          <p className="text-sm text-textSecondary mb-2">Estimated Cost</p>
          <p className="font-mono text-3xl font-bold text-primary mb-1">${totalCost}</p>
          <p className="text-xs text-textSecondary">@ ${ENERGY_RATE_PER_KWH}/kWh</p>
        </div>

        <div className="section-card">
          <p className="text-sm text-textSecondary mb-2">Current Power</p>
          <p className="font-mono text-3xl font-bold text-warning mb-1">{(totalPower / 1000).toFixed(2)} kW</p>
          <p className="text-xs text-textSecondary">Real-time aggregated</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <HistoryChart data={MOCK_ENERGY_TREND} dataKey="consumption" name="Daily Energy Consumption" color="#22C55E" />
        <LiveChart data={MOCK_POWER_TREND} dataKey="power" name="Power Usage" color="#3B82F6" />
      </div>

      {/* Device Breakdown */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-textPrimary">Energy by Device</h2>
        <div className="section-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-textSecondary font-medium">Device</th>
                <th className="px-4 py-3 text-right text-textSecondary font-medium">Energy (kWh)</th>
                <th className="px-4 py-3 text-right text-textSecondary font-medium">Current Power</th>
                <th className="px-4 py-3 text-right text-textSecondary font-medium">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {devices
                .filter((d) => d.readings?.energy)
                .map((device) => (
                  <tr key={device.id} className="border-b border-border/50 hover:bg-border/10">
                    <td className="px-4 py-3 text-textPrimary">{device.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-textPrimary">
                      {device.readings.energy.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-textPrimary">
                      {(device.readings.power / 1000).toFixed(2)} kW
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-success">
                      ${(device.readings.energy * ENERGY_RATE_PER_KWH).toFixed(2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
