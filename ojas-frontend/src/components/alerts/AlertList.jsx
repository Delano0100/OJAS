import AlertItem from './AlertItem'

export default function AlertList({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <div className="section-card text-center py-12">
        <p className="text-textSecondary">No alerts at this time</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  )
}
