import { useEffect, useState } from 'react'
import { EbnrApiError } from '../api/ebnr'
import type { Playlist } from '../types'
import { readAlbumCacheStale } from '../utils/neteaseCache'
import { loadCachedOrFreshAlbum } from '../utils/neteasePlaylistLoad'

export function useNeteaseAlbum(albumId: number | null, gradient: string) {
  const [playlist, setPlaylist] = useState<Playlist | null>(() =>
    albumId != null ? readAlbumCacheStale(albumId) : null,
  )
  const [loading, setLoading] = useState(() => {
    if (albumId == null) return false
    return readAlbumCacheStale(albumId) == null
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (albumId == null) {
      setPlaylist(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const stale = readAlbumCacheStale(albumId)
    if (stale) {
      setPlaylist(stale)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
      setPlaylist(null)
    }

    loadCachedOrFreshAlbum(albumId, gradient)
      .then((result) => {
        if (!cancelled) setPlaylist(result)
      })
      .catch((err: unknown) => {
        if (!cancelled && !stale) {
          setError(err instanceof EbnrApiError ? err.message : '专辑加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [albumId, gradient])

  return { playlist, loading, error }
}
