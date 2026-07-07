import { useMemo, useState } from 'react'
import { useFavoritesContext } from '../context/FavoritesContext'
import { usePlayer } from '../context/PlayerContext'
import { usePlaylists } from '../context/PlaylistsContext'
import { useSongCatalog } from '../context/SongCatalogContext'
import type { Song } from '../types'
import { isLocalSong } from '../utils/localPlaylist'
import { AlbumCover } from './AlbumCover'
import { BottomDrawer } from './BottomDrawer'
import { ConfirmDialog } from './ConfirmDialog'
import { IconChevronLeft } from './icons'

interface SongActionSheetProps {
  song: Song
  onClose: () => void
}

type View = 'actions' | 'playlists' | 'create'

function ActionRow({
  label,
  onClick,
  disabled,
  hint,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-3.5 text-[15px] text-white text-left hover:bg-white/5 active:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-between gap-3"
    >
      <span>{label}</span>
      {hint ? <span className="text-xs text-white/40 shrink-0">{hint}</span> : null}
    </button>
  )
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-white/5">
      <button
        type="button"
        onClick={onBack}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/15 transition-colors shrink-0"
        aria-label="返回"
      >
        <IconChevronLeft className="w-5 h-5 text-white/80" />
      </button>
      <h3 className="text-base font-semibold text-white">{title}</h3>
    </div>
  )
}

export function SongActionSheet({ song, onClose }: SongActionSheetProps) {
  const { playSong, openPlayer, addToQueue, insertAfterCurrent, queue } = usePlayer()
  const { isFavorite, toggleFavorite } = useFavoritesContext()
  const { userPlaylists, createPlaylist, userPlaylistHasSong, addSongToUserPlaylist } = usePlaylists()
  const { removeLocalSong, enqueueDownload, isSongDownloaded } = useSongCatalog()
  const [view, setView] = useState<View>('actions')
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const liked = isFavorite(song.id)
  const local = isLocalSong(song)
  const downloaded = isSongDownloaded(song)
  const inQueue = useMemo(() => queue.some((s) => s.id === song.id), [queue, song.id])

  const run = (action: () => void) => {
    action()
    onClose()
  }

  const handleAddToPlaylist = (playlistId: string) => {
    if (!addSongToUserPlaylist(playlistId, song)) return
    onClose()
  }

  const handleCreateAndAdd = () => {
    const title = newPlaylistTitle.trim() || '新建歌单'
    createPlaylist(title, [song])
    onClose()
  }

  const handleDownload = () => {
    const result = enqueueDownload(song)
    if (result === 'added') onClose()
  }

  return (
    <BottomDrawer onClose={onClose}>
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-white/5">
        <AlbumCover gradient={song.gradient} imageUrl={song.coverUrl} size="sm" rounded="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-white truncate">{song.title}</p>
          <p className="text-sm text-white/50 truncate">{song.artist}</p>
        </div>
      </div>

      {view === 'actions' ? (
        <>
          <ActionRow
            label="播放"
            onClick={() =>
              run(() => {
                playSong(song)
                openPlayer()
              })
            }
          />
          <ActionRow
            label={liked ? '取消收藏' : '收藏'}
            onClick={() => run(() => toggleFavorite(song))}
          />
          <ActionRow label="下一首播放" onClick={() => run(() => insertAfterCurrent(song))} />
          <ActionRow
            label="加入播放队列"
            onClick={() => run(() => addToQueue(song))}
            disabled={inQueue}
            hint={inQueue ? '已在队列' : undefined}
          />
          <ActionRow label="添加到歌单" onClick={() => setView('playlists')} />
          {!local ? (
            <ActionRow
              label="下载到本地"
              onClick={handleDownload}
              hint={downloaded ? '重新下载' : '加入下载列表'}
            />
          ) : null}
          {local ? (
            <ActionRow label="删除" onClick={() => setConfirmDelete(true)} />
          ) : null}
        </>
      ) : null}

      {view === 'playlists' ? (
        <>
          <SubHeader title="添加到歌单" onBack={() => setView('actions')} />
          {userPlaylists.length === 0 ? (
            <p className="px-4 py-6 text-sm text-white/40 text-center">还没有歌单</p>
          ) : (
            userPlaylists.map((playlist) => {
              const hasSong = userPlaylistHasSong(playlist.id, song.id)
              return (
                <ActionRow
                  key={playlist.id}
                  label={playlist.title}
                  onClick={() => handleAddToPlaylist(playlist.id)}
                  disabled={hasSong}
                  hint={hasSong ? '已添加' : undefined}
                />
              )
            })
          )}
          <ActionRow
            label="+ 新建歌单并添加"
            onClick={() => {
              setNewPlaylistTitle('')
              setView('create')
            }}
          />
        </>
      ) : null}

      {view === 'create' ? (
        <>
          <SubHeader title="新建歌单" onBack={() => setView('playlists')} />
          <div className="px-4 py-4 space-y-4">
            <label className="block">
              <span className="text-xs text-white/40 mb-2 block">歌单名称</span>
              <input
                type="text"
                value={newPlaylistTitle}
                onChange={(e) => setNewPlaylistTitle(e.target.value)}
                placeholder="输入歌单名称"
                maxLength={40}
                className="w-full px-3 py-2.5 rounded-lg bg-surface-highlight border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-white/30"
                autoFocus
              />
            </label>
            <button
              type="button"
              onClick={handleCreateAndAdd}
              className="w-full py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              创建并添加
            </button>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="删除本地歌曲"
        message="确定从本地音乐中删除该歌曲吗？此操作不可恢复。"
        confirmLabel="删除"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void removeLocalSong(song.id)
          onClose()
        }}
      />
    </BottomDrawer>
  )
}
