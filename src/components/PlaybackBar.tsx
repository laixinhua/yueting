import { formatDuration } from '../data/mockData'
import { usePlayer } from '../context/PlayerContext'
import { AlbumCover } from './AlbumCover'
import { IconPause, IconPlay, IconQueue } from './icons'

/** 底部播放条：有曲目时显示迷你播放器，否则显示播放队列入口 */
export function PlaybackBar() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    togglePlay,
    openPlayer,
    openQueue,
    progress,
    hasActiveTrack,
    queue,
  } = usePlayer()

  if (!hasActiveTrack) {
    return (
      <div className="w-full glass border-t border-white/5 safe-bottom">
        <button
          type="button"
          onClick={openQueue}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="打开播放队列"
        >
          <div className="w-10 h-10 shrink-0 rounded-lg bg-surface-highlight flex items-center justify-center">
            <IconQueue className="w-5 h-5 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">播放队列</p>
            <p className="text-xs text-white/45 truncate">
              {queue.length > 0 ? `${queue.length} 首待播放` : '队列为空，可从歌曲菜单加入'}
            </p>
          </div>
          <span className="text-xs text-white/40 tabular-nums shrink-0">{queue.length}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="w-full glass border-t border-white/5 safe-bottom">
      <div className="h-0.5 bg-white/10">
        <div
          className={`h-full bg-white/80 transition-all ${isLoading ? 'animate-pulse' : ''}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          onClick={openPlayer}
          className="flex flex-1 items-center gap-3 min-w-0 text-left pl-1"
        >
          <AlbumCover gradient={currentSong.gradient} imageUrl={currentSong.coverUrl} size="sm" rounded="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-white/50 truncate">
              {isLoading ? '加载中...' : `${currentSong.artist} · ${formatDuration(currentSong.duration)}`}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={openQueue}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all relative"
          aria-label={`播放队列，${queue.length} 首`}
        >
          <IconQueue className="w-5 h-5 text-white/70" />
          {queue.length > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center tabular-nums">
              {queue.length > 99 ? '99+' : queue.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <IconPause className="w-5 h-5 block shrink-0" />
          ) : (
            <IconPlay className="w-5 h-5 block shrink-0" />
          )}
        </button>
      </div>
    </div>
  )
}
