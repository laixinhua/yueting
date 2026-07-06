import { formatDuration } from '../data/mockData'
import { usePlayer } from '../context/PlayerContext'
import { sanitizeMusicMeta } from '../utils/musicMeta'
import { AlbumCover } from './AlbumCover'
import { IconPause, IconPlay } from './icons'

export function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    togglePlay,
    openPlayer,
    progress,
    hasActiveTrack,
    sleepTimerActive,
    sleepTimerRemainingLabel,
  } = usePlayer()
  if (!hasActiveTrack) return null

  return (
    <div className="w-full glass border-t border-white/5 safe-bottom">
      <div className="h-0.5 bg-white/10">
        <div
          className={`h-full bg-white/80 transition-all ${isLoading ? 'animate-pulse' : ''}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={openPlayer}
          className="flex flex-1 items-center gap-3 min-w-0 text-left"
        >
          <AlbumCover gradient={currentSong.gradient} imageUrl={currentSong.coverUrl} size="sm" rounded="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentSong.title}</p>
            <p className="text-xs text-white/50 truncate">
              {isLoading ? '加载中...' : sanitizeMusicMeta(currentSong.artist)}
            </p>
            {sleepTimerActive && sleepTimerRemainingLabel ? (
              <p className="text-xs text-amber-300/80 truncate mt-0.5">定时 {sleepTimerRemainingLabel}</p>
            ) : null}
          </div>
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

interface ProgressBarProps {
  progress: number
  currentTime: number
  duration: number
  onSeek?: (ratio: number) => void
  /** 与当前歌曲封面主题一致 */
  accentColor?: string
}

export function ProgressBar({ progress, currentTime, duration, onSeek, accentColor }: ProgressBarProps) {
  const fill = accentColor ?? 'rgba(255,255,255,0.85)'
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(ratio)
  }

  return (
    <div className="px-6">
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (!onSeek) return
          if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.05))
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.05))
        }}
        className="relative h-1.5 bg-white/20 rounded-full group cursor-pointer"
      >
        <div
          className="absolute h-full rounded-full pointer-events-none"
          style={{ width: `${progress * 100}%`, backgroundColor: fill }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ left: `calc(${progress * 100}% - 6px)`, backgroundColor: fill }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-white/50 tabular-nums">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  )
}
