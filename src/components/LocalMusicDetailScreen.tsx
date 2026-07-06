import { useMemo, useState } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import { buildLocalPlaylist } from '../utils/localPlaylist'
import { ConfirmDialog } from './ConfirmDialog'
import { LocalMusicImportControls } from './LocalMusicImportControls'
import { LOCAL_MUSIC_HEADER_BUTTON_CLASS } from './localMusicHeaderButton'
import { PlaylistDetailScreen } from './PlaylistDetailScreen'

interface LocalMusicDetailScreenProps {
  onClose: () => void
}

export function LocalMusicDetailScreen({ onClose }: LocalMusicDetailScreenProps) {
  const { localSongs, clearAllLocalSongs } = useSongCatalog()
  const [confirmClear, setConfirmClear] = useState(false)
  const playlist = useMemo(() => buildLocalPlaylist(localSongs), [localSongs])

  const handleClearAll = async () => {
    setConfirmClear(false)
    await clearAllLocalSongs()
  }

  return (
    <>
      <PlaylistDetailScreen
        playlist={playlist}
        onClose={onClose}
        headerRight={<LocalMusicImportControls variant="header" />}
        listHeaderRight={
          localSongs.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className={LOCAL_MUSIC_HEADER_BUTTON_CLASS}
            >
              一键删除
            </button>
          ) : null
        }
      />
      <ConfirmDialog
        open={confirmClear}
        title="删除全部本地音乐"
        message={`确定删除全部 ${localSongs.length} 首本地歌曲吗？此操作不可恢复。`}
        confirmLabel="全部删除"
        destructive
        onConfirm={() => void handleClearAll()}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  )
}
