import { useEffect, useRef, type ReactNode } from 'react'

type ConfirmationDialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
  confirmDisabled?: boolean
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  confirmDisabled = false
}: ConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    cancelButtonRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 id="confirmation-dialog-title" className="text-lg font-extrabold text-slate-950">{title}</h2>
        {description && <div className="mt-2 text-sm text-slate-600">{description}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelButtonRef} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-500 hover:bg-brand-700'}`}
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
