import { useState, useEffect } from 'react'
import { getJobResult } from '../api/axios'
import useJobPoller from '../hooks/useJobPoller'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ProgressBar from '../components/ui/ProgressBar'
import RegexPill from '../components/ui/RegexPill'
import ResultsTable from '../components/results/ResultsTable'
import Pagination from '../components/results/Pagination'

const STATUS_COLOR = {
  QUEUED: 'warning',
  RUNNING: 'accent',
  SUCCESS: 'success',
  FAILED: 'danger',
  CANCELLED: 'muted',
}

const STAGE_LABEL = (pct) => {
  if (pct < 20) return 'Generating regex pattern…'
  if (pct < 70) return 'Running replacement…'
  return 'Finalising results…'
}

export default function ResultsScreen({ job: initialJob, upload, onBack }) {
  const { job, isTerminal } = useJobPoller(initialJob)
  const [results, setResults] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const columns = results?.columns || upload.column_meta || []

  useEffect(() => {
    if (job.status === 'SUCCESS') fetchPage(1)
  }, [job.status])

  const fetchPage = async (p) => {
    setLoading(true)
    try {
      const res = await getJobResult(job.id, p, 50)
      setResults(res.data)
      setPage(p)
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <Button variant="ghost" onClick={onBack} className="text-xs px-3 py-1.5">
          ← New job
        </Button>
        <div className="flex-1">
          <h2 className="font-bold text-base">{upload.original_name}</h2>
          <p className="text-text-muted text-xs">{job.nl_prompt}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge color={STATUS_COLOR[job.status] || 'muted'}>
            ● {job.status}
          </Badge>
          {job.regex_pattern && <RegexPill pattern={job.regex_pattern} />}
        </div>
      </div>

      {/* Progress */}
      {!isTerminal && (
        <Card className="mb-5">
          <div className="flex justify-between mb-2.5">
            <span className="text-sm font-semibold">Processing</span>
            <span className="text-accent font-bold text-sm">{job.progress}%</span>
          </div>
          <ProgressBar pct={job.progress} />
          <p className="text-text-muted text-xs mt-2">{STAGE_LABEL(job.progress)}</p>
        </Card>
      )}

      {/* Error */}
      {job.status === 'FAILED' && (
        <Card className="mb-5 border-red-900 bg-red-950/30">
          <p className="text-danger font-semibold mb-1">Job failed</p>
          <p className="text-text-muted text-xs font-mono">{job.error_message}</p>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex justify-between items-center">
            <span className="text-sm font-semibold">
              Results — {results.total_rows?.toLocaleString()} rows
            </span>
            <span className="text-text-muted text-xs">
              Page {results.page} of {results.total_pages}
            </span>
          </div>

          <ResultsTable
            columns={columns}
            rows={results.rows}
            loading={loading}
          />

          <Pagination
            page={page}
            totalPages={results.total_pages}
            onPrev={() => fetchPage(page - 1)}
            onNext={() => fetchPage(page + 1)}
            loading={loading}
          />
        </Card>
      )}
    </div>
  )
}