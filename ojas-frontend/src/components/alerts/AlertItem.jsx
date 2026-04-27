import AlertBadge from '../common/AlertBadge'
import { formatTimestamp } from '../../utils/formatters'

export default function AlertItem({ alert }) {
  return (
    <div className="section-card flex items-start gap-4">
      <div className="pt-1">
        <AlertBadge severity={alert.severity} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-textPrimary">{alert.deviceName}</h4>
          <span className="text-xs text-textSecondary">#{alert.id}</span>
        </div>
        <p className="text-sm text-textSecondary mb-2">{alert.message}</p>
        <p className="text-xs text-textSecondary">{formatTimestamp(alert.timestamp)}</p>
      </div>
    </div>
  )
}
