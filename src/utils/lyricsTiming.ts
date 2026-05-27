import type { LyricChar, LyricLine, LyricTrack } from '../types/lyrics'

/** 仅用于无真实 LRC 时间戳的占位歌词 */
export function toLyricTimeline(
  audioTime: number,
  audioDuration: number,
  metaDuration: number,
): number {
  if (!audioDuration || !metaDuration || metaDuration <= 0) return audioTime
  return audioTime * (metaDuration / audioDuration)
}

export function buildCharTimings(text: string, lineStart: number, lineEnd: number): LyricChar[] {
  const chars = [...text]
  if (chars.length === 0) return []
  const span = Math.max(0.05, lineEnd - lineStart)
  const each = span / chars.length
  return chars.map((t, i) => ({
    t,
    start: lineStart + i * each,
    end: lineStart + (i + 1) * each,
  }))
}

export function buildTrackFromTexts(texts: string[], metaDuration: number): LyricTrack {
  const pad = Math.min(8, metaDuration * 0.04)
  const window = Math.max(metaDuration - pad * 2, texts.length * 2)
  const lineSpan = window / texts.length

  const lines: LyricLine[] = texts.map((text, i) => {
    const start = pad + i * lineSpan
    const end = start + lineSpan * 0.92
    return {
      text,
      start,
      end,
      chars: buildCharTimings(text, start, end),
    }
  })

  return { lines, timeline: 'estimated' }
}

/** 标准 LRC：取最后一个 start <= 当前时间的行 */
export function findActiveLineIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return -1
  let active = -1
  for (let i = 0; i < lines.length; i++) {
    if (time + 0.02 >= lines[i].start) active = i
    else break
  }
  return active
}

/** 每字估算演唱时长（秒），用于识别行尾拖音/停顿 */
const PER_CHAR_VOCAL_SEC = 0.24
const MIN_VOCAL_SEC = 0.55
/** 行时长明显长于估算演唱时长时，视为句尾有留白 */
const LONG_TAIL_RATIO = 1.48
/** 有留白时，扫光至少覆盖该行时长的比例（避免过早扫完） */
const TAIL_VOCAL_FRACTION = 0.72

function countSingChars(line: LyricLine): number {
  if (line.chars.length > 0) return line.chars.length
  const trimmed = [...line.text].filter((c) => c.trim())
  return trimmed.length > 0 ? trimmed.length : [...line.text].length
}

/**
 * 一句歌词里「字唱完」的大致时刻。
 * LRC 行结束时间通常等于下一句开始，中间拖音/停顿不会写在时间戳里；
 * 仅在留白明显时缩短扫光窗口，并取「字数估算」与「行时长比例」中较大值。
 */
export function getVocalEnd(line: LyricLine): number {
  const span = line.end - line.start
  if (span <= 0) return line.end

  const n = countSingChars(line)
  if (n === 0) return line.end

  const estimatedSing = Math.max(MIN_VOCAL_SEC, n * PER_CHAR_VOCAL_SEC)

  if (span <= estimatedSing * LONG_TAIL_RATIO) {
    return line.end
  }

  const vocalSpan = Math.max(estimatedSing, span * TAIL_VOCAL_FRACTION)
  return line.start + Math.min(vocalSpan, span * 0.96)
}

/** 当前行 0~1 播放进度，用于从左到右平滑高亮 */
export function getLineProgress(line: LyricLine, time: number): number {
  if (time <= line.start) return 0

  const vocalEnd = getVocalEnd(line)
  if (time >= vocalEnd) return 1

  const vocalSpan = vocalEnd - line.start
  if (vocalSpan <= 0) return 1

  const n = countSingChars(line)
  if (n === 0) {
    return (time - line.start) / vocalSpan
  }

  const t = time - line.start
  for (let i = 0; i < n; i++) {
    const charStart = (i / n) * vocalSpan
    const charEnd = ((i + 1) / n) * vocalSpan
    if (t < charStart) return i / n
    if (t < charEnd) {
      const dur = charEnd - charStart
      return dur > 0 ? (i + (t - charStart) / dur) / n : (i + 1) / n
    }
  }

  return 1
}
