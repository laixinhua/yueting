import type { LyricLine } from '../types/lyrics'
import { getLineProgress } from '../utils/lyricsTiming'

interface KaraokeLineProps {
  line: LyricLine
  lyricTime: number
  isCurrentLine: boolean
  isPastLine: boolean
  className?: string
}

const MASK_FEATHER = 4

function highlightMask(progress: number): string {
  const p = Math.min(100, Math.max(0, progress * 100))
  const softStart = Math.max(0, p - MASK_FEATHER)
  const softEnd = Math.min(100, p + MASK_FEATHER)
  return `linear-gradient(to right, #000 0%, #000 ${softStart}%, transparent ${softEnd}%)`
}

export function KaraokeLine({
  line,
  lyricTime,
  isCurrentLine,
  isPastLine: _isPastLine,
  className = '',
}: KaraokeLineProps) {
  const text = line.text

  if (!isCurrentLine) {
    return <p className={`leading-relaxed ${className}`}>{text}</p>
  }

  const progress = getLineProgress(line, lyricTime)
  const mask = highlightMask(progress)

  return (
    <p className={`leading-relaxed relative inline-block max-w-full text-left ${className}`}>
      <span className="text-white/35">{text}</span>
      <span
        className="absolute inset-0 text-white font-semibold pointer-events-none select-none"
        style={{
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
        aria-hidden
      >
        {text}
      </span>
    </p>
  )
}
