import { useEffect } from 'react'
import Button from './Button'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel  = 'Cancel',
  onConfirm,
  onCancel,
  dangerous = true,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="
          relative z-10 w-full max-w-sm
          bg-bg-surface border border-border rounded-2xl
          shadow-2xl overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Top accent line */}
        <div className={`h-0.5 w-full ${dangerous ? 'bg-danger' : 'bg-accent'}`} />

        <div className="p-6">
          {/* Icon */}
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center mb-4 text-lg
            ${dangerous ? 'bg-red-950 text-danger' : 'bg-accent-dim text-accent'}
          `}>
            {dangerous ? '⚠' : '?'}
          </div>

          {/* Title */}
          <h2 className="text-base font-bold text-text-primary mb-2">
            {title}
          </h2>

          {/* Message */}
          <p className="text-sm text-text-muted leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-sm"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={dangerous ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="text-sm"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}