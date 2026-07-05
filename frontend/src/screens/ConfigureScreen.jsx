import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import JobForm from '../components/configure/JobForm'

export default function ConfigureScreen({ upload, onJobCreated, onBack }) {
  const columns = upload.column_meta || []

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={onBack} className="text-xs px-3 py-1.5">
          ← Back
        </Button>
        <div className="flex-1">
          <h2 className="font-bold text-base">{upload.original_name}</h2>
          <p className="text-text-muted text-xs">
            {upload.row_count?.toLocaleString()} rows · {columns.length} columns
          </p>
        </div>
        <Badge color="success">● Ready</Badge>
      </div>

      {/* Column type preview */}
      <Card className="mb-5 p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold">Columns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.name} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted bg-bg-elevated border-b border-border">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map(col => (
                  <td key={col.name} className="px-4 py-2.5 text-xs font-mono text-text-muted border-b border-border">
                    {col.dtype}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Job form */}
      <Card>
        <JobForm upload={upload} onJobCreated={onJobCreated} />
      </Card>
    </div>
  )
}