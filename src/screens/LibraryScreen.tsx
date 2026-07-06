import { useMemo, useState } from 'react'
import { useFavoritesContext } from '../context/FavoritesContext'
import { useRecentPlaysContext } from '../context/RecentPlaysContext'
import { usePlayer } from '../context/PlayerContext'
import { usePlaylists } from '../context/PlaylistsContext'
import { AlbumCover } from '../components/AlbumCover'
import { DownloadListScreen } from '../components/DownloadListScreen'
import { LocalMusicDetailScreen } from '../components/LocalMusicDetailScreen'
import { PlaylistDetailScreen } from '../components/PlaylistDetailScreen'
import { PlaylistEditorPanel } from '../components/PlaylistEditorPanel'
import { SettingsPanel } from '../components/SettingsPanel'
import { SongRow } from '../components/SongRow'
import { IconHeart, IconDownload, IconMusic, IconSettings } from '../components/icons'
import { buildLikedPlaylist, LIKED_EMPTY_GRADIENT } from '../utils/likedPlaylist'
import { gradientStyle } from '../utils/gradientStyle'
import { LOCAL_EMPTY_GRADIENT } from '../utils/localPlaylist'
import { useSongCatalog } from '../context/SongCatalogContext'
import type { Playlist } from '../types'

export function LibraryScreen() {
  const { playSong } = usePlayer()
  const { favoriteSongs } = useFavoritesContext()
  const { localSongs, activeDownloadCount, downloadTasks } = useSongCatalog()
  const { userPlaylists } = usePlaylists()
  const { recentSongs } = useRecentPlaysContext()
  const [editing, setEditing] = useState<Playlist | null | 'new'>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showLikedDetail, setShowLikedDetail] = useState(false)
  const [showDownloadList, setShowDownloadList] = useState(false)
  const [showLocalDetail, setShowLocalDetail] = useState(false)
  const [detailPlaylist, setDetailPlaylist] = useState<Playlist | null>(null)

  const likedPlaylist = useMemo(() => buildLikedPlaylist(favoriteSongs), [favoriteSongs])
  const likedCoverUrl = likedPlaylist.coverUrl
  const downloadSubtitle =
    activeDownloadCount > 0
      ? `${activeDownloadCount} 项下载中`
      : downloadTasks.length > 0
        ? `${downloadTasks.length} 项记录`
        : '暂无下载'

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between px-4 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">我的音乐</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="w-10 h-10 rounded-full bg-surface-highlight flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
          aria-label="设置"
        >
          <IconSettings className="w-5 h-5 text-white/70" />
        </button>
      </header>

      <section className="px-4 mb-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowLikedDetail(true)}
          className="w-full flex items-center gap-4 p-4 rounded-xl shadow-lg shadow-black/30 text-left active:opacity-90 transition-opacity overflow-hidden"
          style={gradientStyle(LIKED_EMPTY_GRADIENT)}
        >
          {likedCoverUrl ? (
            <AlbumCover
              gradient={LIKED_EMPTY_GRADIENT}
              imageUrl={likedCoverUrl}
              size="md"
              rounded="md"
              className="!w-14 !h-14 shadow-none"
            />
          ) : (
            <div className="w-14 h-14 shrink-0 rounded-lg bg-zinc-600/80 flex items-center justify-center">
              <IconHeart className="w-8 h-8 text-white/70" filled />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-lg">我喜欢的音乐</p>
            <p className="text-sm text-white/70">{favoriteSongs.length} 首歌曲</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowDownloadList(true)}
          className="w-full flex items-center gap-4 p-4 rounded-xl shadow-lg shadow-black/30 text-left active:opacity-90 transition-opacity overflow-hidden"
          style={gradientStyle(LIKED_EMPTY_GRADIENT)}
        >
          <div className="w-14 h-14 shrink-0 rounded-lg bg-zinc-600/80 flex items-center justify-center">
            <IconDownload className="w-8 h-8 text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-lg">下载列表</p>
            <p className="text-sm text-white/70">{downloadSubtitle}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowLocalDetail(true)}
          className="w-full flex items-center gap-4 p-4 rounded-xl shadow-lg shadow-black/30 text-left active:opacity-90 transition-opacity overflow-hidden"
          style={gradientStyle(LOCAL_EMPTY_GRADIENT)}
        >
          <div className="w-14 h-14 shrink-0 rounded-lg bg-zinc-600/80 flex items-center justify-center">
            <IconMusic className="w-8 h-8 text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-lg">本地音乐</p>
            <p className="text-sm text-white/70">{localSongs.length} 首歌曲</p>
          </div>
        </button>
      </section>

      <section className="px-4 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">我的歌单</h2>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="text-sm text-white/80 font-medium hover:text-white"
          >
            + 新建
          </button>
        </div>
        {userPlaylists.length === 0 ? (
          <p className="text-sm text-white/40 py-4 text-center">还没有歌单，点击「新建」创建第一个</p>
        ) : (
          <div className="space-y-2">
            {userPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="group w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setDetailPlaylist(playlist)}
                  className="flex flex-1 items-center gap-3 min-w-0 text-left"
                >
                  <AlbumCover gradient={playlist.gradient} size="md" rounded="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{playlist.title}</p>
                    <p className="text-sm text-white/50">{playlist.songs.length} 首歌曲</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(playlist)}
                  className="shrink-0 px-3 py-1.5 text-xs text-white/50 hover:text-white rounded-lg hover:bg-white/10"
                >
                  编辑
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white mb-3 px-4">最近播放</h2>
        <div className="rounded-xl mx-4 overflow-hidden bg-surface-highlight/30">
          {recentSongs.length === 0 ? (
            <p className="text-center text-white/40 py-8 text-sm">暂无播放记录</p>
          ) : (
            recentSongs.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                index={i}
                onClick={() => playSong(song)}
              />
            ))
          )}
        </div>
      </section>

      {showLikedDetail ? (
        <PlaylistDetailScreen playlist={likedPlaylist} onClose={() => setShowLikedDetail(false)} />
      ) : null}
      {showDownloadList ? <DownloadListScreen onClose={() => setShowDownloadList(false)} /> : null}
      {showLocalDetail ? <LocalMusicDetailScreen onClose={() => setShowLocalDetail(false)} /> : null}
      {detailPlaylist ? (
        <PlaylistDetailScreen playlist={detailPlaylist} onClose={() => setDetailPlaylist(null)} />
      ) : null}
      {editing !== null ? (
        <PlaylistEditorPanel
          playlist={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  )
}
