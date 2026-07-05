import { useState } from 'react'

export default function RegexPill({ pattern }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(pattern)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <span
      onClick={copy}
      title="Click to copy"
      className="
        inline-flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer
        bg-accent-dim border border-accent/30 text-purple-300
        font-mono text-xs max-w-xs truncate
        hover:border-accent/60 transition-colors duration-150
      "
      style={{ boxShadow: '0 0 12px rgba(124,109,250,0.15)' }}
    >
      {copied ? '✓ copied' : pattern}
    </span>
  )
}