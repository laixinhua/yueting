import { useCallback, useState } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import { AppToast } from './AppToast'
import { LOCAL_MUSIC_HEADER_BUTTON_CLASS } from './localMusicHeaderButton'
import { LocalMusicScanScreen } from './LocalMusicScanScreen'

interface LocalMusicImportControlsProps {
  variant?: 'panel' | 'header'
  className?: string
}

export function LocalMusicImportControls({ variant = 'panel', className }: LocalMusicImportControlsProps) {
  const { importProgress } = useSongCatalog()
  const [showScan, setShowScan] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const dismissToast = useCallback(() => setToast(null), [])

  const busy = showScan && importProgress != null

  const progressLabel =
    importProgress && importProgress.total > 0
      ? `添加中 ${importProgress.done}/${importProgress.total}`
      : '添加中…'

  const buttonLabel = busy ? progressLabel : '扫描添加'

  const buttonClass =
    variant === 'header'
      ? LOCAL_MUSIC_HEADER_BUTTON_CLASS
      : 'px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 active:scale-95 transition-all disabled:opacity-50'

  return (
    <>
      <div className={className}>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setToast(null)
            setShowScan(true)
          }}
          className={buttonClass}
        >
          {buttonLabel}
        </button>
        {showScan ? (
          <LocalMusicScanScreen
            onClose={() => setShowScan(false)}
            onDone={(result) => {
              if (result.imported.length > 0) {
                setToast(`已添加 ${result.imported.length} 首`)
              }
              setShowScan(false)
            }}
          />
        ) : null}
      </div>
      <AppToast message={toast} onDismiss={dismissToast} />
    </>
  )
}
