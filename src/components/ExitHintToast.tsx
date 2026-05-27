interface ExitHintToastProps {
  visible: boolean
}

export function ExitHintToast({ visible }: ExitHintToastProps) {
  if (!visible) return null

  return (
    <div
      className="fixed left-1/2 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[85] -translate-x-1/2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-full bg-surface-elevated/95 border border-white/10 px-5 py-2.5 shadow-lg shadow-black/50">
        <p className="text-sm text-white/90 whitespace-nowrap">再按一次退出应用</p>
      </div>
    </div>
  )
}
