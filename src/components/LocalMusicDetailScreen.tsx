import { useMemo, useRef, useState } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import { buildLocalPlaylist } from '../utils/localPlaylist'
import { PlaylistDetailScreen } from './PlaylistDetailScreen'

interface LocalMusicDetailScreenProps {
  onClose: () => void
}

export function LocalMusicDetailScreen({ onClose }: LocalMusicDetailScreenProps) {
  const { localSongs, importFiles } = useSongCatalog()
  const playlist = useMemo(() => buildLocalPlaylist(localSongs), [localSongs])
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return
    setImporting(true)
    try {
      await importFiles(files)
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <PlaylistDetailScreen
        playlist={playlist}
        onClose={onClose}
        headerRight={
          <button
            type="button"
            disabled={importing}
            onClick={() => inputRef.current?.click()}
            className="px-4 py-1.5 rounded-full bg-white/10 text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-50 transition-colors"
          >
            {importing ? '导入中…' : '添加音乐'}
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac"
        multiple
        className="hidden"
        onChange={(e) => void handleImport(e.target.files)}
      />
    </>
  )
}
