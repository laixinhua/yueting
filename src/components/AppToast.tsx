import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const DEFAULT_TOAST_MS = 2000

interface AppToastProps {
  message: string | null
  onDismiss?: () => void
  durationMs?: number
}

export function AppToast({ message, onDismiss, durationMs = DEFAULT_TOAST_MS }: AppToastProps) {
  useEffect(() => {
    if (!message || !onDismiss) return
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss, durationMs])

  if (!message) return null

  return (
    <ToastBubble>
      <p className="text-sm text-white/90 text-center whitespace-nowrap">{message}</p>
    </ToastBubble>
  )
}

export function ToastBubble({ children }: { children: ReactNode }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none px-6"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl bg-surface-elevated/95 border border-white/10 px-6 py-3 shadow-lg shadow-black/50">
        {children}
      </div>
    </div>,
    document.body,
  )
}

export { DEFAULT_TOAST_MS as APP_TOAST_DURATION_MS }
