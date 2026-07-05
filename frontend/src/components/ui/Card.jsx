export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-bg-surface border border-border rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  )
}