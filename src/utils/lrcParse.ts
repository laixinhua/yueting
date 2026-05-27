import type { LyricLine, LyricTrack } from '../types/lyrics'
import { buildCharTimings } from './lyricsTiming'

const META_LINE =
  /^(作词|作曲|编曲|制作|和声|吉他|贝斯|鼓|录音|混音|发行|推广|SP|和声编写|录音工程|录音助理)/

interface LrcRow {
  time: number
  text: string
}

function parseTimestamp(minStr: string, secStr: string): number {
  return Number(minStr) * 60 + Number(secStr)
}

/** 解析 LRC 头部 [offset:±500]（毫秒） */
export function parseLrcOffsetSec(lrc: string): number {
  const m = /\[offset:\s*([+-]?\d+)\s*\]/i.exec(lrc)
  if (!m) return 0
  return Number(m[1]) / 1000
}

const TAG_RE = /\[(\d+):(\d+(?:\.\d+)?)\]/g

/** 解析标准 LRC 文本为带时间戳的行（支持一行多个时间戳） */
export function parseLrcRows(lrc: string): LrcRow[] {
  const rows: LrcRow[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const times: number[] = []
    TAG_RE.lastIndex = 0
    let tagMatch: RegExpExecArray | null
    while ((tagMatch = TAG_RE.exec(line)) !== null) {
      times.push(parseTimestamp(tagMatch[1], tagMatch[2]))
    }
    if (!times.length) continue

    const text = line.replace(/\[(\d+):(\d+(?:\.\d+)?)\]/g, '').trim()
    if (!text) continue
    if (META_LINE.test(text.replace(/\s/g, ''))) continue

    for (const time of times) {
      rows.push({ time, text })
    }
  }

  rows.sort((a, b) => a.time - b.time || a.text.localeCompare(b.text))
  return rows
}

export function lrcRowsToTrack(
  rows: LrcRow[],
  songDuration: number,
  offsetSec = 0,
): LyricTrack | null {
  if (rows.length === 0) return null

  const duration = songDuration > 0 ? songDuration : rows[rows.length - 1]!.time + 8

  const lines: LyricLine[] = rows.map((row, i) => {
    const nextTime = rows[i + 1]?.time ?? duration
    const start = row.time + offsetSec
    const end = Math.max(start + 0.05, Math.min(nextTime + offsetSec, duration))
    return {
      text: row.text,
      start,
      end,
      chars: buildCharTimings(row.text, start, end),
    }
  })

  return { lines, timeline: 'lrc', offsetSec }
}

export function parseLrcToTrack(lrc: string, songDuration: number): LyricTrack | null {
  const offsetSec = parseLrcOffsetSec(lrc)
  return lrcRowsToTrack(parseLrcRows(lrc), songDuration, offsetSec)
}
