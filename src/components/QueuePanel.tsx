import { useEffect, useRef } from 'react'
import { usePlayer } from '../context/PlayerContext'
import { useShellOverlayClass } from '../hooks/useShellOverlay'
import { AlbumCover } from './AlbumCover'
import { IconChevronLeft, IconPause, IconPlay } from './icons'

export function QueuePanel() {
  const {
    queue,
    queueIndex,
    playQueueIndex,
    isPlaying,
    currentSong,
    togglePlay,
    closeQueue,
    removeFromQueue,
    clearQueue,
  } = usePlayer()
  const shellClass = useShellOverlayClass('above')
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [queueIndex])

  return (
    <div className={`${shellClass} flex flex-col bg-surface`}>
      <header className="shrink-0 flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/5">
        <button
          type="button"
          onClick={closeQueue}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="返回"
        >
          <IconChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">播放队列 ({queue.length})</h1>
        {queue.length > 0 ? (
          <button
            type="button"
            onClick={clearQueue}
            className="text-sm text-white/45 hover:text-white/80 px-2 py-1 transition-colors"
          >
            清空
          </button>
        ) : null}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
        {queue.length === 0 ? (
          <p className="text-center text-white/40 py-16 text-sm">
            队列为空，播放歌曲或从菜单加入队列后会显示在这里
          </p>
        ) : (
          queue.map((song, i) => {
            const active = i === queueIndex
            return (
              <div
                key={`${song.id}-${i}`}
                ref={active ? activeRef : undefined}
                className={`w-full flex items-center gap-2 p-3 rounded-xl mb-2 transition-colors ${
                  active ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <button
                  type="button"
                  onClick={() => playQueueIndex(i)}
                  className="flex flex-1 items-center gap-3 min-w-0 text-left"
                >
                  <span
                    className={`w-6 text-center text-sm tabular-nums shrink-0 ${
                      active ? 'text-white font-medium' : 'text-white/40'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <AlbumCover gradient={song.gradient} imageUrl={song.coverUrl} size="sm" rounded="md" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-white/90'}`}>
                      {song.title}
                    </p>
                    <p className="text-xs text-white/50 truncate">{song.artist}</p>
                  </div>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => (active ? togglePlay() : playQueueIndex(i))}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors"
                    aria-label={active ? (isPlaying ? '暂停' : '播放') : `播放 ${song.title}`}
                  >
                    {active && isPlaying && currentSong.id === song.id ? (
                      <IconPause className="w-4 h-4 block" />
                    ) : (
                      <IconPlay className="w-4 h-4 block" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white/35 hover:text-white/70 hover:bg-white/10 text-lg leading-none"
                    aria-label={`从队列移除 ${song.title}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
