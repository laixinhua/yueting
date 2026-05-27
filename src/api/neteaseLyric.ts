import { EbnrApiError } from './ebnr'
import { parseLrcToTrack } from '../utils/lrcParse'
import type { LyricTrack } from '../types/lyrics'

const BASE =
  (import.meta.env.VITE_NETEASE_LYRIC_BASE as string | undefined)?.replace(/\/$/, '') ??
  '/api/netease-lyric'

interface NeteaseLyricResponse {
  code?: number
  lrc?: { lyric?: string }
  tlyric?: { lyric?: string }
}

const cache = new Map<number, { lrc: string; track: LyricTrack }>()

export async function fetchNeteaseLyric(
  trackId: number,
  songDuration: number,
): Promise<LyricTrack | null> {
  const cached = cache.get(trackId)
  if (cached) {
    const reparsed = parseLrcToTrack(cached.lrc, songDuration)
    if (reparsed) {
      cache.set(trackId, { lrc: cached.lrc, track: reparsed })
      return reparsed
    }
    return cached.track
  }

  const url = `${BASE}/lyric?id=${trackId}`
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    throw new EbnrApiError('无法连接歌词服务，请检查网络')
  }

  if (!res.ok) {
    throw new EbnrApiError(`歌词服务错误（${res.status}）`, res.status)
  }

  const data = (await res.json()) as NeteaseLyricResponse
  const lrcText = data.lrc?.lyric?.trim()
  if (!lrcText) return null

  const track = parseLrcToTrack(lrcText, songDuration)
  if (track) cache.set(trackId, { lrc: lrcText, track })
  return track
}
