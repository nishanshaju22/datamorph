import ProgressBar from '../ui/ProgressBar'
import Badge from '../ui/Badge'

export default function FileRow({ file, progress, uploading, onRemove }) {
  const done = uploading && progress === 100

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-lg">📄</span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{file.name}</p>
            <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {done && <Badge color="success">✓ Inspecting…</Badge>}
          {!uploading && (
            <button
              onClick={onRemove}
              className="text-text-muted hover:text-danger text-xl leading-none transition-colors"
            >
              X
            </button>
          )}
          {uploading && !done && (
            <span className="text-accent text-sm font-semibold">{progress}%</span>
          )}
        </div>
      </div>
      <ProgressBar
        pct={progress}
        color={done ? 'bg-success' : 'bg-accent'}
      />
    </div>
  )
}