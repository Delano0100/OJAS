export default function AlertBadge({ severity = 'info' }) {
  const styles = {
    critical: 'bg-danger/20 text-danger border border-danger/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    info: 'bg-primary/20 text-primary border border-primary/30',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[severity]}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}
