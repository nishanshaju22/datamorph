export default function ColumnSelector({ columns, selected, onToggle }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-3 text-text-primary">
        Target columns
      </label>
      <div className="flex flex-wrap gap-2">
        {columns.map(col => {
          const isSelected = selected.includes(col.name)
          return (
            <button
              key={col.name}
              onClick={() => onToggle(col.name)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-mono border transition-all duration-150
                ${isSelected
                  ? 'border-accent bg-accent-dim text-accent font-semibold'
                  : 'border-border bg-bg-elevated text-text-muted hover:border-accent/50'
                }
              `}
            >
              {col.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}