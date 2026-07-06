import { useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import type { Playlist } from '../types'
import { readPlaylistCacheStale } from '../utils/neteaseCache'
import { loadCachedOrFreshPlaylist } from '../utils/neteasePlaylistLoad'

export function useNeteasePlaylist(playlistId: number | null, gradient: string, label?: string) {
  const [playlist, setPlaylist] = useState<Playlist | null>(() =>
    playlistId != null ? readPlaylistCacheStale(playlistId) : null,
  )
  const [loading, setLoading] = useState(() => {
    if (playlistId == null) return false
    return readPlaylistCacheStale(playlistId) == null
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (playlistId == null) {
      setPlaylist(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const stale = readPlaylistCacheStale(playlistId)
    if (stale) {
      setPlaylist(stale)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
      setPlaylist(null)
    }

    loadCachedOrFreshPlaylist(playlistId, gradient, label)
      .then((result) => {
        if (!cancelled) setPlaylist(result)
      })
      .catch((err: unknown) => {
        if (!cancelled && !stale) {
          setError(err instanceof EbnrApiError ? err.message : '歌单加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playlistId, gradient, label])

  return { playlist, loading, error }
}
