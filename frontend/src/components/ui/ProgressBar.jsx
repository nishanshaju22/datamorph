export default function ProgressBar({ pct, color = 'bg-accent' }) {
  return (
    <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}