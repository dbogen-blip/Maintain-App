// Ephemeral notification bar that auto-dismisses after `duration` ms.
// Supports an optional undo action (shown as a button inside the toast).
// Usage:
//   const [toast, setToast] = useState(null)
//   setToast({ message: 'Slettet', undo: () => restore() })
//   <Toast toast={toast} onDismiss={() => setToast(null)} />
import { useEffect, useRef } from 'react'
import './Toast.css'

export default function Toast({ toast, onDismiss, duration = 7000 }) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onDismiss, duration)
    return () => clearTimeout(timerRef.current)
  }, [toast, duration, onDismiss])

  if (!toast) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast-message">{toast.message}</span>
      <div className="toast-actions">
        {toast.undo && (
          <button
            className="toast-undo"
            onClick={() => {
              clearTimeout(timerRef.current)
              toast.undo()
              onDismiss()
            }}
          >
            Angre
          </button>
        )}
        <button className="toast-close" aria-label="Lukk" onClick={onDismiss}>✕</button>
      </div>
    </div>
  )
}
