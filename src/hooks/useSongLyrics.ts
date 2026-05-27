import { useEffect, useState } from 'react'
import { fetchNeteaseLyric } from '../api/neteaseLyric'
import { EbnrApiError } from '../api/ebnr'
import { getLyricTrack } from '../data/lyricsTracks'
import type { Song } from '../types'
import type { LyricTrack } from '../types/lyrics'
import { parseNeteaseId } from '../utils/neteaseSong'

export function useSongLyrics(song: Song, audioDuration = 0) {
  const [track, setTrack] = useState<LyricTrack | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const durationForLyrics = audioDuration > 0 ? audioDuration : song.duration
  const ncmId = song.neteaseId ?? parseNeteaseId(song.id)

  useEffect(() => {
    const staticTrack = getLyricTrack(song.id)
    if (staticTrack) {
      setTrack(staticTrack)
      setLoading(false)
      setError(null)
      return
    }

    if (ncmId == null) {
      setTrack(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchNeteaseLyric(ncmId, durationForLyrics)
      .then((result) => {
        if (cancelled) return
        setTrack(result)
        if (!result) setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setTrack(null)
        setError(err instanceof EbnrApiError ? err.message : '歌词加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [song.id, song.neteaseId, ncmId, durationForLyrics])

  return { track, loading, error }
}
