export default function ResultsTable({ columns, rows, loading }) {
  if (loading) {
    return (
      <div className="py-16 text-center text-text-muted text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.name}
                className="
                  px-4 py-3 text-left text-xs font-semibold uppercase
                  tracking-wider text-text-muted bg-bg-elevated
                  border-b border-border whitespace-nowrap
                "
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-bg-elevated transition-colors duration-100">
              {columns.map(col => (
                <td
                  key={col.name}
                  className="
                    px-4 py-2.5 text-sm text-text-primary
                    border-b border-border last:border-b-0
                    max-w-xs truncate
                  "
                >
                  {row[col.name] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}