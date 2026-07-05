import { useState, useEffect } from 'react'
import { listUploads, listJobs, deleteUpload } from '../../api/axios'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ConfirmModal from '../ui/ConfirmModal'

const STATUS_COLOR = {
  QUEUED: 'warning',
  RUNNING: 'accent',
  SUCCESS: 'success',
  FAILED: 'danger',
  CANCELLED: 'muted',
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function HistoryPanel({ onSelectJob }) {
  const [uploads, setUploads] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [deleting, setDeleting] = useState(null)

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  })

  const openModal = ({ title, message, onConfirm }) => {
    setModal({ isOpen: true, title, message, onConfirm })
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false, onConfirm: null }))
  }

  const load = async () => {
    setLoading(true)
    try {
      const [uploadsRes, jobsRes] = await Promise.all([
        listUploads(),
        listJobs(),
      ])
      setUploads(uploadsRes.data)
      setJobs(jobsRes.data)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const jobsForUpload = (uploadId) =>
    jobs.filter(j => j.upload === uploadId)

  const toggleExpand = (id) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleDeleteUpload = (e, upload) => {
    e.stopPropagation()
    openModal({
      title: 'Delete upload',
      message: `Delete "${upload.original_name}" and all ${jobsForUpload(upload.id).length} associated job(s)? This cannot be undone.`,
      onConfirm: async () => {
        closeModal()
        setDeleting(upload.id)
        try {
          await deleteUpload(upload.id)
          await load()
        } catch (_) {}
        setDeleting(null)
      },
    })
  }

  const handleDeleteAll = () => {
    openModal({
      title: 'Clear all history',
      message: `Delete all ${uploads.length} upload(s) and all associated jobs? This cannot be undone.`,
      onConfirm: async () => {
        closeModal()
        setDeleting('all')
        try {
          await Promise.all(uploads.map(u => deleteUpload(u.id)))
          await load()
        } catch (_) {}
        setDeleting(null)
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        Loading history…
      </div>
    )
  }

  return (
    <>
      {/* Confirm modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        confirmLabel="Delete"
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />

      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-text-muted text-sm text-center px-4">
          <div className="text-2xl mb-2">📂</div>
          <p>No uploads yet.</p>
          <p className="text-xs mt-1">Your history will appear here.</p>
        </div>
      ) : (
        <div>
          {/* Header row */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-text-muted">
              {uploads.length} upload{uploads.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="danger"
              onClick={handleDeleteAll}
              disabled={deleting === 'all'}
              className="text-xs px-3 py-1.5"
            >
              {deleting === 'all' ? 'Deleting…' : 'Clear all'}
            </Button>
          </div>

          {/* Upload list */}
          <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
            {uploads.map(upload => {
              const uploadJobs = jobsForUpload(upload.id)
              const isExpanded = expanded[upload.id]
              const isDeleting = deleting === upload.id

              return (
                <div
                  key={upload.id}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  {/* Upload row */}
                  <div
                    onClick={() => toggleExpand(upload.id)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-elevated transition-colors duration-150"
                  >
                    <span className="text-base">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {upload.original_name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {upload.row_count?.toLocaleString() ?? '—'} rows · {timeAgo(upload.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {uploadJobs.length > 0 && (
                        <span className="text-xs text-text-muted bg-bg-elevated px-2 py-0.5 rounded-full">
                          {uploadJobs.length} job{uploadJobs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteUpload(e, upload)}
                        disabled={isDeleting}
                        className="text-text-muted hover:text-danger transition-colors text-lg leading-none px-1 disabled:opacity-40"
                        title="Delete upload"
                      >
                        {isDeleting ? '…' : 'X'}
                      </button>
                    </div>
                    <span className="text-text-muted text-xs">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Jobs list */}
                  {isExpanded && (
                    <div className="border-t border-border bg-bg-base">
                      {uploadJobs.length === 0 ? (
                        <p className="text-xs text-text-muted px-4 py-3">
                          No jobs for this upload.
                        </p>
                      ) : (
                        uploadJobs.map(job => (
                          <div
                            key={job.id}
                            onClick={() => onSelectJob(job, upload)}
                            className="
                              flex items-center gap-3 px-4 py-3 cursor-pointer
                              hover:bg-bg-elevated transition-colors duration-150
                              border-b border-border last:border-b-0
                            "
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-text-primary truncate font-medium">
                                {job.nl_prompt}
                              </p>
                              <p className="text-xs text-text-muted mt-0.5">
                                → "{job.replacement || '(empty)'}" · {timeAgo(job.created_at)}
                              </p>
                            </div>
                            <Badge color={STATUS_COLOR[job.status] || 'muted'}>
                              {job.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}