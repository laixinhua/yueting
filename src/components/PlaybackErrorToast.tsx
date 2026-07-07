import { useEffect } from 'react'
import { usePlayer } from '../context/PlayerContext'

export function PlaybackErrorToast() {
  const { error, dismissError } = usePlayer()

  useEffect(() => {
    if (!error) return
    // 延长停留时间，确保用户看清错误内容（原 6s 过短）
    const timer = window.setTimeout(() => dismissError(), 12000)
    return () => window.clearTimeout(timer)
  }, [error, dismissError])

  if (!error) return null

  return (
    <div
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] px-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-2 rounded-2xl bg-red-950/95 border border-red-500/40 px-4 py-3 shadow-lg shadow-black/40 w-fit max-w-[min(85vw,20rem)]">
        <p className="text-sm text-red-100 text-center leading-snug">{error}</p>
        <button
          type="button"
          onClick={dismissError}
          className="shrink-0 text-red-300/80 hover:text-red-100 text-base leading-none"
          aria-label="关闭提示"
        >
          ×
        </button>
      </div>
    </div>
  )
}
