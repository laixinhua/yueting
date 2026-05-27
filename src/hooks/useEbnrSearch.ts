import { useEffect, useState } from 'react'
import { EbnrApiError, searchTracks } from '../api/ebnr'
import type { Song } from '../types'
import { filterPlayableNeteaseSongs } from '../utils/neteasePlayable'
import { ebnrTrackToSong } from '../utils/neteaseSong'

export interface EbnrSearchState {
  songs: Song[]
  loading: boolean
  error: string | null
}

export function useEbnrSearch(keyword: string, enabled = true): EbnrSearchState {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = keyword.trim()
    if (!enabled || !q) {
      setSongs([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    searchTracks(q, 30)
      .then(async (tracks) => {
        if (cancelled) return
        const songs = tracks.map(ebnrTrackToSong)
        setSongs(await filterPlayableNeteaseSongs(songs))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setSongs([])
        setError(err instanceof EbnrApiError ? err.message : '搜索失败，请稍后重试')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [keyword, enabled])

  return { songs, loading, error }
}
