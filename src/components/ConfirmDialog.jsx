// Reusable confirm/alert dialog that replaces native confirm() and alert().
// Wraps the existing Modal so it inherits all modal styles including the
// bottom-sheet layout on mobile.
//
// variant='danger'  → red confirm button (use for destructive actions)
// infoOnly=true     → hides the cancel button, renders an acknowledge-only alert
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Bekreft',
  cancelLabel  = 'Avbryt',
  variant      = 'primary',
  infoOnly     = false,
  loading      = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null

  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      {message && (
        <p style={{
          color: 'var(--color-text-muted)',
          marginTop: 0,
          marginBottom: 'var(--space-5)',
          whiteSpace: 'pre-line',
          lineHeight: 1.6,
        }}>
          {message}
        </p>
      )}
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        {!infoOnly && (
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
        )}
        <Button
          variant={variant}
          loading={loading}
          onClick={infoOnly ? onClose : onConfirm}
        >
          {infoOnly ? 'OK' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
