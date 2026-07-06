import { useEffect } from 'react'
import { useSongCatalog } from '../context/SongCatalogContext'
import { useNeteasePlaylist } from '../hooks/useNeteasePlaylist'
import { Overlay } from './Overlay'
import { PlaylistDetailScreen } from './PlaylistDetailScreen'

interface NeteasePlaylistDetailScreenProps {
  playlistId: number
  title: string
  gradient: string
  onClose: () => void
}

export function NeteasePlaylistDetailScreen({
  playlistId,
  title,
  gradient,
  onClose,
}: NeteasePlaylistDetailScreenProps) {
  const { playlist, loading, error } = useNeteasePlaylist(playlistId, gradient)
  const { upsertNeteaseSongs } = useSongCatalog()

  useEffect(() => {
    if (playlist?.songs.length) upsertNeteaseSongs(playlist.songs)
  }, [playlist, upsertNeteaseSongs])

  if (loading) {
    return (
      <Overlay title={title} onClose={onClose}>
        <p className="text-center text-white/50 py-20 text-sm">正在加载歌单…</p>
      </Overlay>
    )
  }

  if (error || !playlist) {
    return (
      <Overlay title={title} onClose={onClose}>
        <div className="text-center py-20 px-6 space-y-2">
          <p className="text-white/50 text-sm">{error ?? '歌单加载失败'}</p>
          <p className="text-white/35 text-xs">请使用 npm run dev 启动以启用音乐代理</p>
        </div>
      </Overlay>
    )
  }

  return <PlaylistDetailScreen playlist={playlist} onClose={onClose} />
}
