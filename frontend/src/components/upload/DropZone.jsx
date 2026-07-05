import { useRef, useCallback } from 'react'

const ALLOWED = ['.csv', '.xlsx', '.xls']

export default function DropZone({ onFile, dragging, setDragging }) {
  const inputRef = useRef()

  const handleFile = useCallback((f) => {
    if (!f) return
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!ALLOWED.includes(ext)) return
    onFile(f)
  }, [onFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
      onClick={() => inputRef.current.click()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
        transition-all duration-200
        ${dragging
          ? 'border-accent bg-accent-dim'
          : 'border-border bg-bg-elevated hover:border-accent/50'
        }
      `}
    >
      <div className="text-3xl mb-3">↑</div>
      <p className="font-semibold text-text-primary mb-1">
        Drag and drop your file here
      </p>
      <p className="text-text-muted text-sm">
        Accepted file types: CSV, XLSX, XLS
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}