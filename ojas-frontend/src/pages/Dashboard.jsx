import { Activity, AlertCircle, Cpu, Zap } from 'lucide-react'
import { useDevices } from '../hooks/useDevices'
import AlertList from '../components/alerts/AlertList'
import DeviceCard from '../components/devices/DeviceCard'
import LiveChart from '../components/charts/LiveChart'
import Loader from '../components/common/Loader'
import { MOCK_POWER_TREND } from '../utils/constants'

export default function Dashboard() {
  const { devices, alerts, loading } = useDevices()

  if (loading) return <Loader />

  const onlineCount = devices.filter((d) => d.status === 'online').length
  const offlineCount = devices.filter((d) => d.status === 'offline').length
  const alertCount = alerts.filter((a) => a.severity === 'critical').length

  const stats = [
    { label: 'Total Devices', value: devices.length, icon: Cpu, color: 'text-primary' },
    { label: 'Online', value: onlineCount, icon: Activity, color: 'text-success' },
    { label: 'Offline', value: offlineCount, icon: AlertCircle, color: 'text-danger' },
    { label: 'Critical Alerts', value: alertCount, icon: Zap, color: 'text-warning' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-textPrimary mb-1">Dashboard</h1>
        <p className="text-textSecondary">Real-time monitoring and analytics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="section-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-textSecondary mb-2">{stat.label}</p>
                  <p className="font-mono text-3xl font-bold text-textPrimary">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Energy Consumption Chart */}
        <div className="lg:col-span-2">
          <LiveChart data={MOCK_POWER_TREND} dataKey="power" name="Power Consumption" color="#3B82F6" />
        </div>

        {/* Recent Alerts */}
        <div className="section-card">
          <h3 className="mb-4 font-semibold text-textPrimary">Recent Alerts</h3>
          <AlertList alerts={alerts.slice(0, 3)} />
        </div>
      </div>

      {/* Device Overview */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-textPrimary">Device Status Overview</h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {devices.slice(0, 6).map((device) => (
            <DeviceCard key={device.deviceId} device={device} />
          ))}
        </div>
      </div>
    </div>
  )
}
