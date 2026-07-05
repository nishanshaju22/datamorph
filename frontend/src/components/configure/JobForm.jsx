import { useState } from 'react'
import { createJob } from '../../api/axios'
import ColumnSelector from './ColumnSelector'
import Button from '../ui/Button'

export default function JobForm({ upload, onJobCreated }) {
  const [selectedCols, setSelectedCols] = useState([])
  const [prompt, setPrompt] = useState('')
  const [replacement, setReplacement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleCol = (name) =>
    setSelectedCols(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    )

  const handleSubmit = async () => {
    if (!prompt.trim()) { setError('Please describe the pattern to find.'); return }
    if (selectedCols.length === 0) { setError('Please select at least one column.'); return }

    setSubmitting(true)
    setError('')

    try {
      const res = await createJob({
        upload_id: upload.id,
        nl_prompt: prompt,
        target_columns: selectedCols,
        replacement,
      })
      onJobCreated(res.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        'Failed to start job.'
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ColumnSelector
        columns={upload.column_meta || []}
        selected={selectedCols}
        onToggle={toggleCol}
      />

      <div>
        <label className="block text-sm font-semibold mb-2 text-text-primary">
          Describe the pattern
        </label>
        <input
          type="text"
          placeholder='e.g. "find all email addresses" or "UK phone numbers"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="
            w-full px-4 py-2.5 rounded-md text-sm
            bg-bg-elevated border border-border text-text-primary
            placeholder-text-muted outline-none
            focus:border-accent focus:ring-2 focus:ring-accent/20
            transition-all duration-150
          "
        />
        <p className="text-xs text-text-muted mt-1.5">
          Describe in plain English — the AI converts it to a regex pattern.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-text-primary">
          Replace with
        </label>
        <input
          type="text"
          placeholder='e.g. "REDACTED" or leave empty to remove matches'
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          className="
            w-full px-4 py-2.5 rounded-md text-sm
            bg-bg-elevated border border-border text-text-primary
            placeholder-text-muted outline-none
            focus:border-accent focus:ring-2 focus:ring-accent/20
            transition-all duration-150
          "
        />
      </div>

      {error && (
        <div className="px-4 py-3 rounded-md bg-red-950 border border-red-900 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Starting…' : 'Run replacement →'}
        </Button>
      </div>
    </div>
  )
}