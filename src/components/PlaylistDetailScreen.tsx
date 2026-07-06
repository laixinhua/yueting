import { usePlayer } from '../context/PlayerContext'
import type { Playlist } from '../types'
import { isAlbumPlaylist } from '../utils/albumPlaylists'
import { LOCAL_PLAYLIST_ID } from '../utils/localPlaylist'
import { LIKED_PLAYLIST_ID } from '../utils/likedPlaylist'
import { AlbumCover } from './AlbumCover'
import { Overlay } from './Overlay'
import { SongRow } from './SongRow'
import { IconPause, IconPlay } from './icons'
import type { ReactNode } from 'react'

interface PlaylistDetailScreenProps {
  playlist: Playlist
  onClose: () => void
  headerRight?: ReactNode
  listHeaderRight?: ReactNode
}

export function PlaylistDetailScreen({ playlist, onClose, headerRight, listHeaderRight }: PlaylistDetailScreenProps) {
  const { playSong, togglePlay, currentSong, isPlaying, queue } = usePlayer()
  const isAlbum = isAlbumPlaylist(playlist)
  const isArtist = playlist.id.startsWith('artist-')
  const isNeteasePl = playlist.id.startsWith('ncm-pl-')
  const isLocal = playlist.id === LOCAL_PLAYLIST_ID
  const isLiked = playlist.id === LIKED_PLAYLIST_ID
  const headerTitle = playlist.title
  const typeLabel = isLocal
    ? '本地音乐'
    : isAlbum
      ? '专辑'
      : isArtist
        ? '歌手'
        : isNeteasePl
          ? '网易云歌单'
          : '歌单'

  const isThisQueue =
    playlist.songs.length > 0 &&
    queue.length === playlist.songs.length &&
    queue.every((s, i) => s.id === playlist.songs[i]?.id)
  const playingThis = isThisQueue && playlist.songs.some((s) => s.id === currentSong.id) && isPlaying

  const handlePlayAll = () => {
    if (playlist.songs.length === 0) return
    if (playingThis) {
      togglePlay()
      return
    }
    playSong(playlist.songs[0], { queue: playlist.songs })
  }

  return (
    <Overlay title={headerTitle} onClose={onClose} headerRight={headerRight}>
      <div className="px-4 pt-4 pb-8">
        <div className="flex gap-4 items-start mb-6">
          <div className="w-32 h-32 shrink-0">
            <AlbumCover
              gradient={playlist.gradient}
              imageUrl={playlist.coverUrl}
              size="lg"
              rounded="lg"
              hidePlaceholderIcon={(isLiked || isLocal) && !playlist.coverUrl}
              className="shadow-xl shadow-black/40"
            />
          </div>
          <div className="flex-1 min-w-0 self-stretch flex flex-col justify-center min-h-32">
            <p className="text-xs text-white/40 mb-1.5 leading-none">{typeLabel}</p>
            <h2 className="text-2xl font-bold text-white leading-tight">{playlist.title}</h2>
            {playlist.description && !isArtist ? (
              <p className="text-sm text-white/60 mt-2 leading-relaxed">{playlist.description}</p>
            ) : null}
            <p className="text-xs text-white/40 mt-2 leading-none">{playlist.songs.length} 首歌曲</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlayAll}
          disabled={playlist.songs.length === 0}
          className="w-full mb-6 flex items-center justify-center gap-2 py-3 rounded-full bg-white text-black font-semibold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {playingThis ? (
            <>
              <IconPause className="w-5 h-5 block shrink-0" />
              暂停播放
            </>
          ) : (
            <>
              <IconPlay className="w-5 h-5 block shrink-0" />
              播放全部
            </>
          )}
        </button>

        <section>
          <div className="flex items-center justify-between gap-3 mb-2 px-1">
            <h3 className="text-sm font-semibold text-white/50">歌曲列表</h3>
            {listHeaderRight ? <div className="shrink-0">{listHeaderRight}</div> : null}
          </div>
          {playlist.songs.length === 0 ? (
            <p className="text-center text-white/40 py-10 text-sm">
              {isLiked
                ? '还没有收藏，在播放页点击红心添加'
                : isLocal
                  ? '还没有音乐，点击右上角「扫描添加」'
                  : isAlbum
                    ? '专辑暂无歌曲'
                    : isArtist
                      ? '该歌手暂无歌曲'
                      : '歌单暂无歌曲'}
            </p>
          ) : (
            <div className="rounded-xl overflow-hidden bg-surface-highlight/30">
              {playlist.songs.map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={i}
                  showAlbum={!isAlbum}
                  onClick={() => playSong(song)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Overlay>
  )
}
