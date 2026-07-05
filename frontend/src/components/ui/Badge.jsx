const colorMap = {
  accent:  'bg-accent-dim text-accent',
  success: 'bg-green-950 text-success',
  danger:  'bg-red-950 text-danger',
  warning: 'bg-yellow-950 text-warning',
  muted:   'bg-bg-elevated text-text-muted',
}

export default function Badge({ children, color = 'accent' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold ${colorMap[color]}`}>
      {children}
    </span>
  )
}