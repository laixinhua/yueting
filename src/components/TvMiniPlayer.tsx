import { usePlayer } from '../context/PlayerContext'
import { AlbumCover } from './AlbumCover'
import {
  IconPause,
  IconPlay,
  IconQueue,
  IconSkipBack,
  IconSkipForward,
} from './icons'

export function TvMiniPlayer() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    togglePlay,
    playNext,
    playPrevious,
    openPlayer,
    openQueue,
    progress,
    hasActiveTrack,
    queue,
  } = usePlayer()

  if (!hasActiveTrack) {
    return (
      <div className="shrink-0 glass border-t border-white/10 safe-bottom px-8 py-4">
        <button
          type="button"
          onClick={openQueue}
          className="tv-focus flex items-center gap-4 text-white/70 hover:text-white"
        >
          <IconQueue className="w-8 h-8" />
          <span className="text-xl">播放队列（{queue.length} 首）</span>
        </button>
      </div>
    )
  }

  return (
    <div className="shrink-0 glass border-t border-white/10 safe-bottom px-8 py-5">
      <div className="h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-white/80 transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={openPlayer}
          className="tv-focus flex items-center gap-5 flex-1 min-w-0 text-left rounded-xl p-2 -m-2 hover:bg-white/5"
        >
          <AlbumCover gradient={currentSong.gradient} size="md" rounded="lg" />
          <div className="min-w-0">
            <p className="text-2xl font-bold text-white truncate">{currentSong.title}</p>
            <p className="text-lg text-white/50 truncate mt-0.5">
              {isLoading ? '加载中...' : currentSong.artist}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-6 shrink-0">
          <button
            type="button"
            onClick={openQueue}
            className="tv-focus w-14 h-14 flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="播放队列"
          >
            <IconQueue className="w-9 h-9 text-white/70" />
          </button>
          <button
            type="button"
            onClick={playPrevious}
            className="tv-focus w-14 h-14 flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="上一首"
          >
            <IconSkipBack className="w-10 h-10 block" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="tv-focus w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl disabled:opacity-60"
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <IconPause className="w-10 h-10 text-black block" />
            ) : (
              <IconPlay className="w-10 h-10 text-black block" />
            )}
          </button>
          <button
            type="button"
            onClick={playNext}
            className="tv-focus w-14 h-14 flex items-center justify-center rounded-full hover:bg-white/10"
            aria-label="下一首"
          >
            <IconSkipForward className="w-10 h-10 block" />
          </button>
        </div>
      </div>
    </div>
  )
}
