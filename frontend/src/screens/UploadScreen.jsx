import { useState } from 'react'
import { uploadFile, getUpload } from '../api/axios'
import DropZone from '../components/upload/DropZone'
import FileRow from '../components/upload/FileRow'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import HistoryPanel from '../components/history/HistoryPanel'

export default function UploadScreen({ onUploaded, onSelectJob }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async () => {
    if (!file || uploading) return
    setUploading(true)
    setProgress(0)
    setError('')

    try {
      const res = await uploadFile(file, setProgress)
      const uploadId = res.data.id

      let upload = res.data
      while (upload.status === 'PENDING') {
        await new Promise(r => setTimeout(r, 1000))
        const poll = await getUpload(uploadId)
        upload = poll.data
      }

      if (upload.status === 'FAILED') throw new Error('File inspection failed.')
      onUploaded(upload)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base p-8">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Data<span className="text-accent">Morph</span>
        </h1>
        <p className="text-text-muted text-sm mt-1">Pattern replacement at scale</p>
      </div>

      {/* Two column layout */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left upload */}
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            New upload
          </p>
          <Card className="bg-bg-surface">
            <DropZone
              onFile={(f) => { setFile(f); setError('') }}
              dragging={dragging}
              setDragging={setDragging}
            />

            {file && (
              <FileRow
                file={file}
                progress={progress}
                uploading={uploading}
                onRemove={() => { setFile(null); setProgress(0) }}
              />
            )}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-md bg-red-950 border border-red-900 text-danger text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center mt-5">
              <p className="text-xs text-text-muted">CSV, XLSX, XLS · max 500 MB</p>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploading…' : 'Upload →'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right history */}
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Recent jobs
          </p>
          <Card className="bg-bg-surface">
            <HistoryPanel onSelectJob={onSelectJob} />
          </Card>
        </div>

      </div>
    </div>
  )
}