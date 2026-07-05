import Button from '../ui/Button'

export default function Pagination({ page, totalPages, onPrev, onNext, loading }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-border">
      <Button
        variant="ghost"
        onClick={onPrev}
        disabled={page <= 1 || loading}
        className="text-xs px-3 py-1.5"
      >
        ← Prev
      </Button>
      <span className="text-text-muted text-sm">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="ghost"
        onClick={onNext}
        disabled={page >= totalPages || loading}
        className="text-xs px-3 py-1.5"
      >
        Next →
      </Button>
    </div>
  )
}
