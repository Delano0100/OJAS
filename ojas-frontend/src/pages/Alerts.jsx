import { useDevices } from '../hooks/useDevices'
import AlertList from '../components/alerts/AlertList'
import Loader from '../components/common/Loader'

export default function Alerts() {
  const { alerts, loading } = useDevices()

  if (loading) return <Loader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-textPrimary mb-1">Alerts & Notifications</h1>
        <p className="text-textSecondary">Real-time system alerts and warnings</p>
      </div>

      {/* Filter Summary */}
      <div className="section-card">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-textSecondary mb-1">Critical</p>
            <p className="font-mono text-2xl font-bold text-danger">
              {alerts.filter((a) => a.severity === 'critical').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-textSecondary mb-1">Warning</p>
            <p className="font-mono text-2xl font-bold text-warning">
              {alerts.filter((a) => a.severity === 'warning').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-textSecondary mb-1">Info</p>
            <p className="font-mono text-2xl font-bold text-primary">
              {alerts.filter((a) => a.severity === 'info').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-textSecondary mb-1">Total</p>
            <p className="font-mono text-2xl font-bold text-textPrimary">{alerts.length}</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <AlertList alerts={alerts} />
    </div>
  )
}
