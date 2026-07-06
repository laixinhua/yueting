import { useMemo } from 'react'
import { useLyricsAlign } from '../context/LyricsAlignContext'
import { usePlayer } from '../context/PlayerContext'
import { useSongLyrics } from '../hooks/useSongLyrics'
import { findActiveLineIndex, toLyricTimeline } from '../utils/lyricsTiming'
import { isNeteaseSong } from '../utils/neteaseSong'
import { KaraokeLine } from './KaraokeLine'
import type { Song } from '../types'

interface InlineLyricsProps {
  song: Song
}

const CONTEXT = 2
const ROW_COUNT = CONTEXT * 2 + 1

/** 固定 5 行窗口，当前行始终在第 3 行（居中） */
function slotIndices(activeIndex: number, total: number): (number | null)[] {
  const center = activeIndex < 0 ? 0 : activeIndex
  return Array.from({ length: ROW_COUNT }, (_, row) => {
    const offset = row - CONTEXT
    if (activeIndex < 0 && offset < 0) return null
    const idx = center + offset
    if (idx < 0 || idx >= total) return null
    return idx
  })
}

export function InlineLyrics({ song }: InlineLyricsProps) {
  const { mode } = useLyricsAlign()
  const { currentTime, duration } = usePlayer()
  const { track, loading, error } = useSongLyrics(song, duration)

  const lyricTime = useMemo(() => {
    if (!track) return currentTime
    const useEstimatedTimeline = track.timeline === 'estimated' && !isNeteaseSong(song)
    if (useEstimatedTimeline) {
      return toLyricTimeline(currentTime, duration, song.duration)
    }
    return currentTime
  }, [track, currentTime, duration, song])

  const activeIndex = track ? findActiveLineIndex(track.lines, lyricTime) : -1
  const slots = track ? slotIndices(activeIndex, track.lines.length) : []

  if (loading) {
    return (
      <div className="flex flex-1 min-h-[9.5rem] flex-col justify-center items-center px-4 text-center">
        <p className="text-sm text-white/40">正在加载歌词…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 min-h-[9.5rem] flex-col justify-center items-center px-4 text-center">
        <p className="text-sm text-white/40">{error}</p>
        <p className="text-xs text-white/30 mt-2">请确认已启动开发服务以使用歌词代理</p>
      </div>
    )
  }

  if (!track?.lines.length) {
    return (
      <div className="flex flex-1 min-h-[9.5rem] flex-col justify-center items-center px-4 text-center">
        <p className="text-sm text-white/40">暂无歌词</p>
        <p className="text-xs text-white/30 mt-2">可在下方「歌词设置」调整显示方式</p>
      </div>
    )
  }

  const lineClass = (i: number) => {
    const isCurrent = i === activeIndex
    const isPast = activeIndex >= 0 && i < activeIndex
    const isUpcoming = activeIndex < 0 && i === 0
    if (isCurrent) return 'text-lg font-semibold text-white'
    if (isUpcoming) return 'text-base text-white/45'
    return isPast ? 'text-base text-white/55' : 'text-base text-white/35'
  }

  const renderLine = (i: number) => {
    const line = track.lines[i]
    const onLeft = i % 2 === 0
    const wrapClass =
      mode === 'alternate'
        ? `max-w-[88%] w-full ${onLeft ? 'self-start text-left pl-1' : 'self-end text-right pr-1'}`
        : 'w-full text-center'

    const isCurrent = i === activeIndex
    const isPast = activeIndex >= 0 && i < activeIndex
    const isUpcoming = activeIndex < 0 && i === 0

    return (
      <div key={`${song.id}-${i}`} className={wrapClass}>
        <KaraokeLine
          line={line}
          lyricTime={lyricTime}
          isCurrentLine={isCurrent}
          isPastLine={isPast || isUpcoming}
          className={lineClass(i)}
        />
      </div>
    )
  }

  const gridClass =
    mode === 'alternate'
      ? 'grid grid-rows-5 flex-1 min-h-0 w-full gap-1 px-3'
      : 'grid grid-rows-5 flex-1 min-h-0 w-full gap-1 px-4'

  return (
    <div className="flex flex-1 min-h-[9.5rem] max-h-[34vh] flex-col overflow-hidden pt-1 pb-2">
      <div className={gridClass}>
        {slots.map((lineIndex, row) => (
          <div
            key={row}
            className={`flex min-h-0 w-full items-center overflow-hidden ${
              lineIndex != null && mode === 'alternate'
                ? lineIndex % 2 === 0
                  ? 'justify-start'
                  : 'justify-end'
                : 'justify-center'
            }`}
          >
            {lineIndex != null ? (
              renderLine(lineIndex)
            ) : (
              <span className="text-base leading-relaxed invisible select-none" aria-hidden>
                ·
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
