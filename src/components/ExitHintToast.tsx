import { createPortal } from 'react-dom'

interface ExitHintToastProps {
  visible: boolean
}

export function ExitHintToast({ visible }: ExitHintToastProps) {
  if (!visible) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none px-6"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-2xl bg-surface-elevated/95 border border-white/10 px-6 py-3 shadow-lg shadow-black/50">
        <p className="text-sm text-white/90 text-center whitespace-nowrap">再按一次退出应用</p>
      </div>
    </div>,
    document.body,
  )
}
